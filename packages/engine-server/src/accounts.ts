import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  CHARACTER_ID,
  KILL_XP_DIVISOR,
  NAME_MAX,
  checkGear,
  checkPack,
  checkPlace,
  checkSheet,
  checkXpDivisor,
  cleanName,
  type Character,
  type CharacterPlace,
  type Gear,
  type Pack,
  type QuestBook,
} from '@game/engine';
import { googleAuthUrl, googleIdentity, newLogin, type GoogleConfig } from './google.ts';
import { AccountStore, LOGIN_STATE_MS, type User } from './store.ts';

/**
 * Accounts on the game server: sign-in with Google, sessions in a cookie, and each account's
 * characters (the JSON API that the menu of the page uses). nginx sends /api/ and /auth/ here,
 * as it sends /ws; in development, Vite does.
 *
 *   GET    /api/me                      who is signed in (how, if an admin, and an admin's XP divisor; or null), and the ways to sign in
 *   DELETE /api/me                      deletes the account, its sessions and its characters
 *   PUT    /api/me/xp-divisor           {divisor}: an admin's divisor of the XP of the kills of its own characters (experience.ts)
 *   GET    /api/characters              the account's characters
 *   POST   /api/characters              a new character (a CharacterSheet as JSON)
 *   POST   /api/characters/<id>/play    the character starts to play (stamps it, returns it)
 *   PUT    /api/characters/<id>/place   {world, x, y}: where it is now, in a world that the page runs
 *                                       (in a world that the server shares, the server keeps it)
 *   DELETE /api/characters/<id>
 *   GET    /auth/google                 to Google's sign-in page
 *   GET    /auth/google/callback        back from Google: a session, then to the page
 *   POST   /auth/dev                    {name}: a session without Google (development only); a name
 *                                       that is an email signs in with that email, as Google would
 *   POST   /auth/logout
 *
 * A request that changes something (POST, PUT, DELETE) must come from one of the game's pages (the
 * Origin header), and the session cookie is SameSite=Lax: another site cannot act for a visitor.
 *
 * An account is signed in on one device at a time: a sign-in ends the account's other sessions
 * (AccountStore.createSession), and onSignIn() tells the game server, which closes their
 * connections. A page whose session ended goes back to the sign-in screen.
 *
 * An admin is an account whose email is in `admins` (ADMIN_EMAILS). Only an admin sees the display
 * settings (the CRT effect) in the game, and chooses the divisor of the XP of the kills of its own
 * characters (Fede's decision, 2026-10-14: to test the levels; the others always have KILL_XP_DIVISOR).
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
   * The address of the page, without a slash at the end: https://world.kandrax.app, or
   * http://localhost:3019 in development. Google sends the visitor back to
   * <publicOrigin>/auth/google/callback, and an https origin makes the cookies Secure.
   */
  readonly publicOrigin: string;
  /**
   * Other addresses of the same page, in the same form and with the same scheme (a mirror:
   * https://game.azyr.io beside https://world.kandrax.app). A request is on a mirror when its Host
   * header names one (nginx sends the visitor's host). A sign-in that starts on a mirror comes back
   * to it: Google sends the visitor to <mirror>/auth/google/callback, and the cookies of a host stay
   * on that host. Each address needs its own redirect URI in the Google client. Default none.
   */
  readonly mirrors?: readonly string[];
  /** Without it, there is no sign-in with Google. */
  readonly google?: GoogleConfig | null;
  /** POST /auth/dev: a sign-in with only a name. Never in production: an https origin refuses it. */
  readonly devLogin?: boolean;
  /** The emails of the admins (ADMIN_EMAILS). Default none. */
  readonly admins?: readonly string[];
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
/** A dev sign-in with a name like this signs in with that email. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  private readonly signInListeners: ((user: User) => void)[] = [];
  private readonly divisorListeners: ((user: User, divisor: number) => void)[] = [];
  private readonly admins: ReadonlySet<string>;
  private readonly mirrors: ReadonlySet<string>;

  /** `origins`: the pages that may change something (null: any, for tests). */
  constructor(options: AccountsOptions, origins: readonly string[] | null, log: (line: string) => void, worlds: PlaceWorlds) {
    const origin = options.publicOrigin.replace(/\/+$/, '');
    if (!/^https?:\/\/[^/]+$/.test(origin)) throw new Error(`accounts: publicOrigin must be like https://host[:port], not "${options.publicOrigin}"`);
    this.secure = origin.startsWith('https:');
    if (options.devLogin && this.secure) throw new Error('accounts: the dev sign-in is for development only, and this origin is https');
    const mirrors = (options.mirrors ?? []).map((mirror) => mirror.replace(/\/+$/, '').toLowerCase());
    for (const mirror of mirrors) {
      if (!/^https?:\/\/[^/]+$/.test(mirror)) throw new Error(`accounts: a mirror must be like https://host[:port], not "${mirror}"`);
      if (mirror.startsWith('https:') !== this.secure) throw new Error(`accounts: the mirror ${mirror} must have the scheme of ${origin}`);
    }
    this.mirrors = new Set(mirrors.filter((mirror) => mirror !== origin));
    this.options = { ...options, publicOrigin: origin };
    this.origins = origins;
    this.log = log;
    this.worlds = worlds;
    this.now = options.now ?? Date.now;
    this.lifetimeMs = (options.sessionDays ?? 30) * DAY_MS;
    this.admins = new Set((options.admins ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean));
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
    return this.sessionOf(request)?.user ?? null;
  }

  /** The session of a request: its user and its token (to ask later if it still lives), or null. */
  sessionOf(request: IncomingMessage): { user: User; token: string } | null {
    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
    const session = token ? this.store.session(token, this.now()) : null;
    return token && session ? { user: session.user, token } : null;
  }

  /** Whether a session (its token) still lives: it did not end, and no later sign-in replaced it. */
  sessionLives(token: string): boolean {
    return this.store.session(token, this.now()) !== null;
  }

  /** Whether a user is an admin: its email is in the list of the admins. */
  isAdmin(user: User): boolean {
    return user.email !== '' && this.admins.has(user.email);
  }

  /** Calls `listener` after each sign-in, which ended the user's other sessions. */
  onSignIn(listener: (user: User) => void): void {
    this.signInListeners.push(listener);
  }

  /** Calls `listener` when an admin chooses another divisor of the XP of its kills: the game server applies it at once. */
  onXpDivisor(listener: (user: User, divisor: number) => void): void {
    this.divisorListeners.push(listener);
  }

  /** The divisor of the XP of the kills of a user's characters: an admin's own choice, else KILL_XP_DIVISOR. */
  xpDivisorOf(user: User): number {
    return (this.isAdmin(user) ? this.store.xpDivisor(user.id) : null) ?? KILL_XP_DIVISOR;
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

  /** Notes what a user's character carries (the server's word, in a shared world). */
  savePack(user: User, id: string, pack: Pack): void {
    const checked = checkPack(pack);
    if (checked && CHARACTER_ID.test(id)) this.store.setPack(user.id, id, checked);
  }

  /** Notes what a user's character wears (the server's word, in a shared world). */
  saveGear(user: User, id: string, gear: Gear): void {
    const checked = checkGear(gear);
    if (checked && CHARACTER_ID.test(id)) this.store.setGear(user.id, id, checked);
  }

  /** Notes the hit points and the refuges of a user's character (the server's word, in a shared world). */
  saveVitals(user: User, id: string, hp: number, refuges: readonly string[]): void {
    if (CHARACTER_ID.test(id) && Number.isFinite(hp)) this.store.setVitals(user.id, id, hp, refuges);
  }

  /** Notes the quest book, the pack and the XP of a user's character together (the server's word, after an effect on a quest). */
  saveQuests(user: User, id: string, quests: QuestBook, pack: Pack, xp: number): void {
    const checked = checkPack(pack);
    if (checked && CHARACTER_ID.test(id)) this.store.setQuests(user.id, id, quests, checked, xp);
  }

  /** Notes the chunks that a user's character has seen (the server's word, in a shared world). */
  saveExplored(user: User, id: string, explored: readonly (readonly [number, number])[]): void {
    if (CHARACTER_ID.test(id)) this.store.setExplored(user.id, id, explored);
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
    if (path === '/api/me/xp-divisor' && method === 'PUT') return this.setXpDivisor(request, response);
    if (path === '/auth/google' && method === 'GET') return this.googleStart(request, response);
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
        user: session ? this.userJson(session.user) : null,
        login: { google: Boolean(this.options.google), dev: Boolean(this.options.devLogin) },
      },
      headers,
    );
  }

  private googleStart(request: IncomingMessage, response: ServerResponse): void {
    const google = this.options.google;
    if (!google) throw new HttpError(404, 'no google sign-in');
    const login = newLogin();
    this.store.saveLoginState(login.state, login.verifier, this.now());
    response.writeHead(302, {
      location: googleAuthUrl(google, this.redirectUri(this.pageOrigin(request)), login.state, login.challenge),
      'set-cookie': this.cookie(LOGIN_COOKIE, login.state, '/auth', LOGIN_STATE_MS),
      'cache-control': 'no-store',
    });
    response.end();
  }

  private async googleCallback(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    const google = this.options.google;
    if (!google) throw new HttpError(404, 'no google sign-in');
    // Google comes back to the address where the sign-in started (googleStart).
    const origin = this.pageOrigin(request);
    const back = (result: string, extra: Record<string, string> = {}) => {
      response.writeHead(302, {
        location: `${origin}/${result ? `?login=${result}` : ''}`,
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
      identity = await googleIdentity(google, this.redirectUri(origin), code, verifier, this.options.fetch ?? fetch, this.now());
    } catch (error) {
      this.log(`accounts: google sign-in failed: ${(error as Error).message}`);
      return back('failed', { 'set-cookie': clearLogin });
    }
    const user = this.store.signIn('google', identity.subject, this.now(), identity.email);
    const token = this.startSession(user);
    response.writeHead(302, {
      location: `${origin}/`,
      'cache-control': 'no-store',
      'set-cookie': [this.cookie(SESSION_COOKIE, token, '/', this.lifetimeMs), clearLogin],
    });
    response.end();
  }

  private async devSignIn(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this.options.devLogin) throw new HttpError(404, 'no dev sign-in');
    const body = (await readJson(request)) as { name?: unknown };
    const raw = typeof body?.name === 'string' && body.name.length <= 4 * NAME_MAX ? body.name.trim() : '';
    const email = EMAIL.test(raw) ? raw.toLowerCase() : '';
    const name = email || cleanName(raw).toLowerCase();
    if (!name) throw new HttpError(400, 'name');
    const user = this.store.signIn('dev', name, this.now(), email);
    const token = this.startSession(user);
    this.json(response, 200, { user: this.userJson(user) }, { 'set-cookie': this.cookie(SESSION_COOKIE, token, '/', this.lifetimeMs) });
  }

  /** An admin chooses the divisor of the XP of the kills of its own characters (the settings of the game). */
  private async setXpDivisor(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const user = this.requireUser(request);
    if (!this.isAdmin(user)) throw new HttpError(403, 'admin');
    const divisor = checkXpDivisor(((await readJson(request)) as { divisor?: unknown } | null)?.divisor);
    if (divisor === null) throw new HttpError(400, 'divisor');
    this.store.setXpDivisor(user.id, divisor);
    for (const listener of this.divisorListeners) listener(user, divisor);
    this.json(response, 200, { xpDivisor: divisor });
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

  /** A new session for a user, which ends its other sessions (and so their connections). */
  private startSession(user: User): string {
    const token = this.store.createSession(user.id, this.now(), this.lifetimeMs);
    for (const listener of this.signInListeners) listener(user);
    return token;
  }

  /** A user as /api/me shows it: how it signs in, whether it is an admin, and an admin's divisor of the XP of its kills. */
  private userJson(user: User): { via: string; admin: boolean; xpDivisor?: number } {
    const admin = this.isAdmin(user);
    return { via: user.provider, admin, ...(admin ? { xpDivisor: this.xpDivisorOf(user) } : {}) };
  }

  private requireUser(request: IncomingMessage): User {
    const user = this.userOf(request);
    if (!user) throw new HttpError(401, 'sign in');
    return user;
  }

  private checkOrigin(request: IncomingMessage): void {
    if (this.origins && !this.origins.includes(String(request.headers.origin ?? ''))) throw new HttpError(403, 'origin');
  }

  /** The address of the page of a request: the mirror that its Host header names, else publicOrigin. */
  private pageOrigin(request: IncomingMessage): string {
    const origin = `${this.secure ? 'https' : 'http'}://${String(request.headers.host ?? '').toLowerCase()}`;
    return this.mirrors.has(origin) ? origin : this.options.publicOrigin;
  }

  private redirectUri(origin: string): string {
    return `${origin}/auth/google/callback`;
  }

  private cookie(name: string, value: string, path: string, maxAgeMs: number): string {
    return `${name}=${value}; Path=${path}; Max-Age=${Math.floor(maxAgeMs / 1000)}; HttpOnly; SameSite=Lax${this.secure ? '; Secure' : ''}`;
  }

  private json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
    response.end(JSON.stringify(body));
  }
}
