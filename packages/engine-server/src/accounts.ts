import type { IncomingMessage, ServerResponse } from 'node:http';
import { CHARACTER_ID, NAME_MAX, checkPlace, checkSheet, cleanName, type Character, type CharacterPlace } from '@game/engine';
import { googleAuthUrl, googleIdentity, newLogin, type GoogleConfig } from './google.ts';
import { AccountStore, LOGIN_STATE_MS, type User } from './store.ts';

/**
 * Accounts on the game server: sign-in with Google, sessions in a cookie, and each account's
 * characters (the JSON API that the menu of the page uses). nginx sends /api/ and /auth/ here,
 * as it sends /ws; in development, Vite does.
 *
 *   GET    /api/me                      who is signed in (how, or null), and the ways to sign in
 *   DELETE /api/me                      deletes the account, its sessions and its characters
 *   GET    /api/characters              the account's characters
 *   POST   /api/characters              a new character (a CharacterSheet as JSON)
 *   POST   /api/characters/<id>/play    the character starts to play (stamps it, returns it)
 *   PUT    /api/characters/<id>/place   {world, x, y}: where it is now, in a world that the page runs
 *                                       (in a world that the server shares, the server keeps it)
 *   DELETE /api/characters/<id>
 *   GET    /auth/google                 to Google's sign-in page
 *   GET    /auth/google/callback        back from Google: a session, then to the page
 *   POST   /auth/dev                    {name}: a session without Google (development only)
 *   POST   /auth/logout
 *
 * A request that changes something (POST, PUT, DELETE) must come from one of the game's pages (the
 * Origin header), and the session cookie is SameSite=Lax: another site cannot act for a visitor.
 */

/** The worlds of the application, for the places of characters. */
export interface PlaceWorlds {
  /** Every world's id. A place in another world is refused. */
  readonly all: ReadonlySet<string>;
  /** The worlds that this server shares (its Rooms): their places come from the server, not from a page. */
  readonly shared: ReadonlySet<string>;
}

export interface AccountsOptions {
  /** The SQLite file (its folder must exist), or ':memory:' for a test. */
  readonly db: string;
  /**
   * The address of the page, without a slash at the end: https://game.azyr.io, or
   * http://localhost:3019 in development. Google sends the visitor back to
   * <publicOrigin>/auth/google/callback, and an https origin makes the cookies Secure.
   */
  readonly publicOrigin: string;
  /** Without it, there is no sign-in with Google. */
  readonly google?: GoogleConfig | null;
  /** POST /auth/dev: a sign-in with only a name. Never in production: an https origin refuses it. */
  readonly devLogin?: boolean;
  /** How long a session lasts without use. Default 30 days. */
  readonly sessionDays?: number;
  /** For tests: the fetch that talks to Google, and the clock. */
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
}

const SESSION_COOKIE = 'game_session';
const LOGIN_COOKIE = 'game_login';
const MAX_BODY_BYTES = 16 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseCookies(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (header ?? '').split(';')) {
    const at = part.indexOf('=');
    if (at > 0) out.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  return out;
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  if (!String(request.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'json only');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'too large');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'bad json');
  }
}

export class Accounts {
  readonly store: AccountStore;
  private readonly options: AccountsOptions;
  private readonly origins: readonly string[] | null;
  private readonly log: (line: string) => void;
  private readonly now: () => number;
  private readonly secure: boolean;
  private readonly lifetimeMs: number;
  private readonly pruneTimer: ReturnType<typeof setInterval>;
  private readonly worlds: PlaceWorlds;

  /** `origins`: the pages that may change something (null: any, for tests). */
  constructor(options: AccountsOptions, origins: readonly string[] | null, log: (line: string) => void, worlds: PlaceWorlds) {
    const origin = options.publicOrigin.replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+$/.test(origin)) throw new Error(`accounts: publicOrigin must be like https://host[:port], not "${options.publicOrigin}"`);
    this.secure = origin.startsWith('https:');
    if (options.devLogin && this.secure) throw new Error('accounts: the dev sign-in is for development only, and this origin is https');
    this.options = { ...options, publicOrigin: origin };
    this.origins = origins;
    this.log = log;
    this.worlds = worlds;
    this.now = options.now ?? Date.now;
    this.lifetimeMs = (options.sessionDays ?? 30) * DAY_MS;
    this.store = new AccountStore(options.db);
    this.pruneTimer = setInterval(() => this.store.prune(this.now()), 60 * 60 * 1000);
    this.pruneTimer.unref();
  }

  close(): void {
    clearInterval(this.pruneTimer);
    this.store.close();
  }

  /** The signed-in user of a request (its session cookie), or null. */
  userOf(request: IncomingMessage): User | null {
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
    return token ? (this.store.session(token, this.now())?.user ?? null) : null;
  }

  /** A user's character, or null if it has no character with that id. */
  characterOf(user: User, id: string): Character | null {
    return CHARACTER_ID.test(id) ? this.store.character(user.id, id) : null;
  }

  /** Notes where a user's character is (the server's word, in a shared world). */
  savePlace(user: User, id: string, place: CharacterPlace): void {
    const checked = checkPlace(place);
    if (checked && CHARACTER_ID.test(id)) this.store.setPlace(user.id, id, checked);
  }

  /** Answers a request of /api/ or /auth/. Returns false for any other path (not answered). */
  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (!path.startsWith('/api/') && !path.startsWith('/auth/')) return false;
    try {
      await this.route(request, response, url);
    } catch (error) {
      if (error instanceof HttpError) this.json(response, error.status, { error: error.message });
      else {
        this.log(`accounts: ${(error as Error).stack ?? String(error)}`);
        this.json(response, 500, { error: 'server' });
      }
    }
    return true;
  }

  private async route(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const method = request.method ?? 'GET';
    const path = url.pathname;
    if (method !== 'GET' && method !== 'HEAD') this.checkOrigin(request);

    if (path === '/api/me' && method === 'GET') return this.me(request, response);
    if (path === '/api/me' && method === 'DELETE') return this.deleteAccount(request, response);
    if (path === '/auth/google' && method === 'GET') return this.googleStart(response);
    if (path === '/auth/google/callback' && method === 'GET') return this.googleCallback(request, response, url);
    if (path === '/auth/dev' && method === 'POST') return this.devSignIn(request, response);
    if (path === '/auth/logout' && method === 'POST') return this.logout(request, response);

    if (path === '/api/characters') {
      const user = this.requireUser(request);
      if (method === 'GET') return this.json(response, 200, { characters: this.store.characters(user.id) });
      if (method === 'POST') {
        const check = checkSheet(await readJson(request));
        if (!check.ok) throw new HttpError(400, `sheet: ${check.error}`);
        const made = this.store.createCharacter(user.id, check.sheet, this.now());
        if (made === 'limit') throw new HttpError(409, 'limit');
        return this.json(response, 201, { character: made });
      }
      throw new HttpError(405, 'method');
    }
    const one = /^\/api\/characters\/([^/]+)(\/play|\/place)?$/.exec(path);
    if (one) {
      const user = this.requireUser(request);
      const id = one[1]!;
      if (!CHARACTER_ID.test(id)) throw new HttpError(404, 'character');
      if (one[2] === '/play' && method === 'POST') {
        const character = this.store.play(user.id, id, this.now());
        if (!character) throw new HttpError(404, 'character');
        return this.json(response, 200, { character });
      }
      if (one[2] === '/place' && method === 'PUT') {
        const place = checkPlace(await readJson(request));
        if (!place || !this.worlds.all.has(place.world)) throw new HttpError(400, 'place');
        if (this.worlds.shared.has(place.world)) throw new HttpError(409, 'shared world');
        if (!this.store.setPlace(user.id, id, place)) throw new HttpError(404, 'character');
        response.writeHead(204, { 'cache-control': 'no-store' });
        response.end();
        return;
      }
      if (!one[2] && method === 'DELETE') {
        if (!this.store.deleteCharacter(user.id, id)) throw new HttpError(404, 'character');
        response.writeHead(204, { 'cache-control': 'no-store' });
        response.end();
        return;
      }
      throw new HttpError(405, 'method');
    }
    throw new HttpError(404, 'not found');
  }

  // ---------------------------------------------------------------- handlers

  private me(request: IncomingMessage, response: ServerResponse): void {
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
    const now = this.now();
    const session = token ? this.store.session(token, now) : null;
    const headers: Record<string, string> = {};
    // A session in use lasts: when less than half of its time is left, it starts again.
    if (token && session && session.expiresAt - now < this.lifetimeMs / 2) {
      this.store.extendSession(token, now + this.lifetimeMs);
      headers['set-cookie'] = this.cookie(SESSION_COOKIE, token, '/', this.lifetimeMs);
    }
    this.json(
      response,
      200,
      {
        user: session ? { via: session.user.provider } : null,
        login: { google: Boolean(this.options.google), dev: Boolean(this.options.devLogin) },
      },
      headers,
    );
  }

  private googleStart(response: ServerResponse): void {
    const google = this.options.google;
    if (!google) throw new HttpError(404, 'no google sign-in');
    const login = newLogin();
    this.store.saveLoginState(login.state, login.verifier, this.now());
    response.writeHead(302, {
      location: googleAuthUrl(google, this.redirectUri(), login.state, login.challenge),
      'set-cookie': this.cookie(LOGIN_COOKIE, login.state, '/auth', LOGIN_STATE_MS),
      'cache-control': 'no-store',
    });
    response.end();
  }

  private async googleCallback(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const google = this.options.google;
    if (!google) throw new HttpError(404, 'no google sign-in');
    const back = (result: string, extra: Record<string, string> = {}) => {
      response.writeHead(302, {
        location: `${this.options.publicOrigin}/${result ? `?login=${result}` : ''}`,
        'cache-control': 'no-store',
        ...extra,
      });
      response.end();
    };
    const clearLogin = this.cookie(LOGIN_COOKIE, '', '/auth', 0);
    // The visitor said no on Google's page.
    if (url.searchParams.get('error')) return back('cancelled', { 'set-cookie': clearLogin });
    const state = url.searchParams.get('state') ?? '';
    const code = url.searchParams.get('code') ?? '';
    // The state must be the one that this browser started (its cookie) and that this server keeps.
    const cookieState = parseCookies(request.headers.cookie).get(LOGIN_COOKIE);
    const verifier = state && code && cookieState === state ? this.store.takeLoginState(state, this.now()) : null;
    if (!verifier) return back('failed', { 'set-cookie': clearLogin });
    let identity;
    try {
      identity = await googleIdentity(google, this.redirectUri(), code, verifier, this.options.fetch ?? fetch, this.now());
    } catch (error) {
      this.log(`accounts: google sign-in failed: ${(error as Error).message}`);
      return back('failed', { 'set-cookie': clearLogin });
    }
    const user = this.store.signIn('google', identity.subject, this.now());
    const token = this.store.createSession(user.id, this.now(), this.lifetimeMs);
    response.writeHead(302, {
      location: `${this.options.publicOrigin}/`,
      'cache-control': 'no-store',
      'set-cookie': [this.cookie(SESSION_COOKIE, token, '/', this.lifetimeMs), clearLogin],
    });
    response.end();
  }

  private async devSignIn(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this.options.devLogin) throw new HttpError(404, 'no dev sign-in');
    const body = (await readJson(request)) as { name?: unknown };
    const name = typeof body?.name === 'string' && body.name.length <= 4 * NAME_MAX ? cleanName(body.name) : '';
    if (!name) throw new HttpError(400, 'name');
    const user = this.store.signIn('dev', name.toLowerCase(), this.now());
    const token = this.store.createSession(user.id, this.now(), this.lifetimeMs);
    this.json(response, 200, { user: { via: user.provider } }, { 'set-cookie': this.cookie(SESSION_COOKIE, token, '/', this.lifetimeMs) });
  }

  /** The visitor deletes its account: the user, its sessions and its characters, at once. */
  private deleteAccount(request: IncomingMessage, response: ServerResponse): void {
    const user = this.requireUser(request);
    this.store.deleteUser(user.id);
    this.log('accounts: an account was deleted');
    response.writeHead(204, { 'cache-control': 'no-store', 'set-cookie': this.cookie(SESSION_COOKIE, '', '/', 0) });
    response.end();
  }

  private logout(request: IncomingMessage, response: ServerResponse): void {
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
    if (token) this.store.endSession(token);
    response.writeHead(204, { 'cache-control': 'no-store', 'set-cookie': this.cookie(SESSION_COOKIE, '', '/', 0) });
    response.end();
  }

  // ---------------------------------------------------------------- helpers

  private requireUser(request: IncomingMessage): User {
    const user = this.userOf(request);
    if (!user) throw new HttpError(401, 'sign in');
    return user;
  }

  private checkOrigin(request: IncomingMessage): void {
    if (this.origins && !this.origins.includes(String(request.headers.origin ?? ''))) throw new HttpError(403, 'origin');
  }

  private redirectUri(): string {
    return `${this.options.publicOrigin}/auth/google/callback`;
  }

  private cookie(name: string, value: string, path: string, maxAgeMs: number): string {
    return `${name}=${value}; Path=${path}; Max-Age=${Math.floor(maxAgeMs / 1000)}; HttpOnly; SameSite=Lax${this.secure ? '; Secure' : ''}`;
  }

  private json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
    response.end(JSON.stringify(body));
  }
}
