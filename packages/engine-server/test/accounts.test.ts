import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { PROTOCOL_VERSION, characterSkin, type CharacterSheet, type ServerMessage, type WorldDefinition } from '@game/engine';
import { houseSource } from '../../engine/test/helpers.ts';
import { AccountStore, startServer, type AccountsOptions, type GameServer } from '../src/index.ts';

const shared: WorldDefinition = { id: 'shared', name: 'Shared', createSource: () => houseSource(), examine: {}, darkness: 0, multiplayer: true };
const ORIGIN = 'http://localhost:3019';

let server: GameServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

async function start(accounts: Partial<AccountsOptions> = {}): Promise<GameServer> {
  server = await startServer({
    worlds: [shared],
    port: 0,
    origins: [ORIGIN],
    log: () => {},
    accounts: { db: ':memory:', publicOrigin: ORIGIN, devLogin: true, ...accounts },
  });
  return server;
}

const sheet: CharacterSheet = {
  name: 'Tordek',
  race: 'dwarf',
  class: 'fighter',
  gender: 'male',
  variant: 77,
  base: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
  bonus: [],
};

/** A browser of one visitor: it keeps its cookies and sends the page's origin. */
class Browser {
  readonly port: number;
  readonly cookies = new Map<string, string>();
  constructor(port: number) {
    this.port = port;
  }

  async request(method: string, path: string, body?: unknown, origin: string | null = ORIGIN): Promise<{ status: number; json: any; headers: Headers }> {
    const headers: Record<string, string> = {};
    if (origin) headers.origin = origin;
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const response = await fetch(`http://127.0.0.1:${this.port}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [name, value] = pair!.split('=');
      if (/Max-Age=0/.test(line)) this.cookies.delete(name!);
      else this.cookies.set(name!, value!);
    }
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null, headers: response.headers };
  }

  async signIn(name: string): Promise<void> {
    const { status } = await this.request('POST', '/auth/dev', { name });
    expect(status).toBe(200);
  }

  /**
   * A WebSocket with this browser's cookies that says hello: the first answer, and every message
   * that it gets (it stays open until close()).
   */
  async hello(message: Record<string, unknown>): Promise<{ first: ServerMessage; messages: ServerMessage[]; close: () => void }> {
    const socket = new WebSocket(`ws://127.0.0.1:${this.port}/ws`, {
      origin: ORIGIN,
      headers: this.cookies.size ? { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {},
    });
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    const messages: ServerMessage[] = [];
    const first = new Promise<ServerMessage>((resolve) =>
      socket.on('message', (data) => {
        messages.push(JSON.parse(data.toString()) as ServerMessage);
        if (messages.length === 1) resolve(messages[0]!);
      }),
    );
    socket.send(JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, world: 'shared', skin: 1, name: 'Spoof', ...message }));
    return { first: await first, messages, close: () => socket.close() };
  }
}

describe('accounts: sessions', () => {
  it('says who is signed in, and how to sign in', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    expect((await browser.request('GET', '/api/me')).json).toEqual({ user: null, login: { google: false, dev: true } });
    await browser.signIn('  Fede ');
    expect((await browser.request('GET', '/api/me')).json.user).toEqual({ via: 'dev' });
    expect((await browser.request('POST', '/auth/logout')).status).toBe(204);
    expect((await browser.request('GET', '/api/me')).json.user).toBeNull();
  });

  it('keeps the session cookie HttpOnly and SameSite=Lax (and not Secure on http)', async () => {
    const { port } = await start();
    const response = await fetch(`http://127.0.0.1:${port}/auth/dev`, { method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: '{"name":"Ana"}' });
    const cookie = response.headers.getSetCookie()[0]!;
    expect(cookie).toMatch(/^game_session=[\w-]{43}; Path=\/; Max-Age=2592000; HttpOnly; SameSite=Lax$/);
  });

  it('refuses the dev sign-in when it is off, and on an https origin', async () => {
    const { port } = await start({ devLogin: false });
    expect((await new Browser(port).request('POST', '/auth/dev', { name: 'Ana' })).status).toBe(404);
    await server!.close();
    server = null;
    await expect(start({ publicOrigin: 'https://game.azyr.io', devLogin: true })).rejects.toThrow(/development only/);
  });

  it('ends a session after its lifetime', async () => {
    let now = 1_000_000;
    const { port } = await start({ now: () => now, sessionDays: 1 });
    const browser = new Browser(port);
    await browser.signIn('Ana');
    now += 23 * 3600 * 1000;
    expect((await browser.request('GET', '/api/me')).json.user).not.toBeNull();
    // Used after more than half its life: it started again, so a day later it still lives.
    now += 23 * 3600 * 1000;
    expect((await browser.request('GET', '/api/me')).json.user).not.toBeNull();
    now += 25 * 3600 * 1000;
    expect((await browser.request('GET', '/api/me')).json.user).toBeNull();
  });
});

describe('accounts: characters', () => {
  it('creates, lists, plays and deletes the characters of an account', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    expect((await browser.request('GET', '/api/characters')).status).toBe(401);
    await browser.signIn('Fede');
    const made = await browser.request('POST', '/api/characters', sheet);
    expect(made.status).toBe(201);
    const id = made.json.character.id as string;
    expect(id).toMatch(/^[0-9a-f]{24}$/);
    expect(made.json.character).toMatchObject({ ...sheet, playedAt: null });
    const second = (await browser.request('POST', '/api/characters', { ...sheet, name: 'Lidda', race: 'halfling', class: 'rogue' })).json.character;
    // The last played first, then the newest.
    expect((await browser.request('GET', '/api/characters')).json.characters.map((c: { name: string }) => c.name)).toEqual(['Lidda', 'Tordek']);
    const played = await browser.request('POST', `/api/characters/${id}/play`);
    expect(played.json.character.playedAt).toEqual(expect.any(Number));
    expect((await browser.request('GET', '/api/characters')).json.characters.map((c: { name: string }) => c.name)).toEqual(['Tordek', 'Lidda']);
    expect((await browser.request('DELETE', `/api/characters/${second.id}`)).status).toBe(204);
    expect((await browser.request('GET', '/api/characters')).json.characters).toHaveLength(1);
  });

  it('checks a sheet on the server', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    await browser.signIn('Fede');
    const tooStrong = await browser.request('POST', '/api/characters', { ...sheet, base: { ...sheet.base, dex: 15, int: 15 } });
    expect(tooStrong).toMatchObject({ status: 400, json: { error: 'sheet: points' } });
    expect((await browser.request('POST', '/api/characters', { ...sheet, race: 'tiefling' })).json.error).toBe('sheet: race');
  });

  it('keeps each account to its own characters', async () => {
    const { port } = await start();
    const a = new Browser(port);
    const b = new Browser(port);
    await a.signIn('Ana');
    await b.signIn('Bea');
    const id = (await a.request('POST', '/api/characters', sheet)).json.character.id as string;
    expect((await b.request('GET', '/api/characters')).json.characters).toEqual([]);
    expect((await b.request('POST', `/api/characters/${id}/play`)).status).toBe(404);
    expect((await b.request('DELETE', `/api/characters/${id}`)).status).toBe(404);
    expect((await a.request('GET', '/api/characters')).json.characters).toHaveLength(1);
  });

  it('refuses a change from another site, and a body that is not JSON', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    await browser.signIn('Fede');
    expect((await browser.request('POST', '/api/characters', sheet, 'https://evil.example')).status).toBe(403);
    expect((await browser.request('POST', '/api/characters', sheet, null)).status).toBe(403);
    const form = await fetch(`http://127.0.0.1:${port}/api/characters`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'text/plain', cookie: [...browser.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: JSON.stringify(sheet),
    });
    expect(form.status).toBe(415);
    expect((await browser.request('GET', '/api/characters')).json.characters).toEqual([]);
  });

  it('keeps at most MAX_CHARACTERS characters', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    await browser.signIn('Fede');
    for (let i = 0; i < 12; i++) expect((await browser.request('POST', '/api/characters', sheet)).status).toBe(201);
    expect((await browser.request('POST', '/api/characters', sheet)).json.error).toBe('limit');
  });
});

describe('accounts: sign-in with Google', () => {
  const google = { clientId: 'client-1.apps.googleusercontent.com', clientSecret: 'secret' };
  const idToken = (claims: Record<string, unknown>) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;

  it('goes to Google with a state and PKCE, and back with a session', async () => {
    const calls: { url: string; body: URLSearchParams }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: init.body as URLSearchParams });
      const exp = Math.floor(Date.now() / 1000) + 3600;
      return new Response(JSON.stringify({ id_token: idToken({ iss: 'https://accounts.google.com', aud: google.clientId, exp, sub: '1234567890', email: 'fede@example.com', name: 'Fede III' }) }));
    }) as unknown as typeof fetch;
    const { port } = await start({ google, fetch: fakeFetch, devLogin: false });
    const browser = new Browser(port);
    expect((await browser.request('GET', '/api/me')).json.login).toEqual({ google: true, dev: false });

    const go = await browser.request('GET', '/auth/google');
    expect(go.status).toBe(302);
    const to = new URL(go.headers.get('location')!);
    expect(to.origin + to.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(to.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/auth/google/callback`);
    expect(to.searchParams.get('code_challenge_method')).toBe('S256');
    // Only the account id: no email, no name, no picture.
    expect(to.searchParams.get('scope')).toBe('openid');
    const state = to.searchParams.get('state')!;
    expect(browser.cookies.get('game_login')).toBe(state);

    const back = await browser.request('GET', `/auth/google/callback?state=${state}&code=the-code`);
    expect(back.status).toBe(302);
    expect(back.headers.get('location')).toBe(`${ORIGIN}/`);
    expect(calls[0]!.url).toBe('https://oauth2.googleapis.com/token');
    expect(calls[0]!.body.get('code')).toBe('the-code');
    expect(calls[0]!.body.get('code_verifier')).toMatch(/^[\w-]{43}$/);
    expect((await browser.request('GET', '/api/me')).json.user).toEqual({ via: 'google' });
    // A state works once.
    const again = await new Browser(port).request('GET', `/auth/google/callback?state=${state}&code=the-code`);
    expect(again.headers.get('location')).toBe(`${ORIGIN}/?login=failed`);
  });

  it('refuses a state from another browser, a wrong audience, and a cancel', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    let aud = 'someone-else';
    const fakeFetch = (async () => new Response(JSON.stringify({ id_token: idToken({ iss: 'accounts.google.com', aud, exp, sub: '1' }) }))) as unknown as typeof fetch;
    const { port } = await start({ google, fetch: fakeFetch });
    const victim = new Browser(port);
    const attacker = new Browser(port);
    const state = new URL((await attacker.request('GET', '/auth/google')).headers.get('location')!).searchParams.get('state')!;
    // The victim did not start this sign-in: no cookie with that state.
    expect((await victim.request('GET', `/auth/google/callback?state=${state}&code=c`)).headers.get('location')).toBe(`${ORIGIN}/?login=failed`);

    const browser = new Browser(port);
    const own = new URL((await browser.request('GET', '/auth/google')).headers.get('location')!).searchParams.get('state')!;
    expect((await browser.request('GET', `/auth/google/callback?state=${own}&code=c`)).headers.get('location')).toBe(`${ORIGIN}/?login=failed`);
    expect((await browser.request('GET', '/api/me')).json.user).toBeNull();
    aud = google.clientId;
    expect((await browser.request('GET', '/auth/google/callback?error=access_denied')).headers.get('location')).toBe(`${ORIGIN}/?login=cancelled`);
  });
});

describe('accounts: the shared world', () => {
  it('plays a stored character: the look and the name come from it', async () => {
    const { port } = await start();
    const browser = new Browser(port);
    await browser.signIn('Fede');
    const id = (await browser.request('POST', '/api/characters', sheet)).json.character.id as string;
    const a = await browser.hello({ character: id });
    expect(a.first.t).toBe('welcome');
    const aId = a.first.t === 'welcome' ? a.first.id : -1;
    // Another visitor sees the character's skin and name, not the ones of the message (skin 1, "Spoof").
    const other = new Browser(port);
    await other.signIn('Bea');
    const otherId = (await other.request('POST', '/api/characters', { ...sheet, name: 'Mialee', race: 'elf', class: 'wizard', gender: 'female' })).json.character.id as string;
    const b = await other.hello({ character: otherId });
    const deadline = Date.now() + 3000;
    let seen: { skin?: number; name?: string } = {};
    while (Date.now() < deadline && !(seen.skin !== undefined && seen.name)) {
      for (const m of b.messages) {
        if (m.t !== 'snap') continue;
        const wire = m.p.find((p) => p[0] === aId);
        if (wire) seen.skin = wire[6];
        const named = m.names?.find(([pid]) => pid === aId);
        if (named) seen.name = named[1];
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    a.close();
    b.close();
    expect(seen).toEqual({ skin: characterSkin(sheet), name: 'Tordek' });
  });

  it('refuses a visitor without a session, without a character, or with another account’s', async () => {
    const { port } = await start();
    const owner = new Browser(port);
    await owner.signIn('Ana');
    const id = (await owner.request('POST', '/api/characters', sheet)).json.character.id as string;
    expect((await new Browser(port).hello({ character: id })).first).toEqual({ t: 'refused', reason: 'account' });
    expect((await owner.hello({})).first).toEqual({ t: 'refused', reason: 'account' });
    const other = new Browser(port);
    await other.signIn('Bea');
    expect((await other.hello({ character: id })).first).toEqual({ t: 'refused', reason: 'account' });
  });
});

describe('accounts: personal data', () => {
  it('deletes an account with its sessions and characters, and only that account', async () => {
    const { port } = await start();
    const a = new Browser(port);
    const b = new Browser(port);
    await a.signIn('Ana');
    await b.signIn('Bea');
    await a.request('POST', '/api/characters', sheet);
    const kept = (await b.request('POST', '/api/characters', sheet)).json.character.id as string;
    const oldCookie = a.cookies.get('game_session')!;
    expect((await a.request('DELETE', '/api/me', undefined, 'https://evil.example')).status).toBe(403);
    expect((await a.request('DELETE', '/api/me')).status).toBe(204);
    expect(a.cookies.has('game_session')).toBe(false);
    // The old session is gone too, not only the cookie.
    a.cookies.set('game_session', oldCookie);
    expect((await a.request('GET', '/api/me')).json.user).toBeNull();
    expect((await a.request('GET', '/api/characters')).status).toBe(401);
    expect((await b.request('GET', '/api/characters')).json.characters.map((c: { id: string }) => c.id)).toEqual([kept]);
    // A new sign-in starts from nothing.
    await a.signIn('Ana');
    expect((await a.request('GET', '/api/characters')).json.characters).toEqual([]);
  });

  it('keeps no email and no name, and removes them from an old database', () => {
    const dir = mkdtempSync(join(tmpdir(), 'game-store-'));
    try {
      // A database of the first schema, with an email and a name.
      const file = join(dir, 'game.db');
      const old = new DatabaseSync(file);
      old.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, provider TEXT NOT NULL, subject TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, last_login_at INTEGER NOT NULL, UNIQUE (provider, subject));
        CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
        CREATE INDEX sessions_user ON sessions (user_id);
        CREATE TABLE login_states (state TEXT PRIMARY KEY, verifier TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE characters (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, sheet TEXT NOT NULL, created_at INTEGER NOT NULL, played_at INTEGER);
        CREATE INDEX characters_user ON characters (user_id);
        INSERT INTO users (provider, subject, email, name, created_at, last_login_at) VALUES ('google', '123', 'a@example.com', 'Ana', 1, 1);
        PRAGMA user_version = 1;`);
      old.close();
      const store = new AccountStore(file);
      const user = store.signIn('google', '123', 2);
      expect(user).toEqual({ id: 1, provider: 'google' });
      store.close();
      const check = new DatabaseSync(file);
      const columns = (check.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map((c) => c.name);
      expect(columns.sort()).toEqual(['created_at', 'id', 'last_login_at', 'provider', 'subject']);
      check.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
