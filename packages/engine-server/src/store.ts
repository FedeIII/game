import { createHash, randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { EMPTY_PACK, MAX_CHARACTERS, checkPack, checkPlace, checkSheet, type Character, type CharacterPlace, type CharacterSheet, type Pack } from '@game/engine';

/**
 * The accounts database: one SQLite file (node:sqlite, so no native package), in WAL mode. It
 * keeps the accounts (only the provider's id of each: no name, no email), their sessions, the
 * short-lived states of a Google sign-in, and their characters. A character's sheet is JSON (checkSheet() checks it on the way in and on the
 * way out), so a new field needs no change of the schema.
 *
 * The schema has a version (PRAGMA user_version). To change it, add a step at the end of
 * MIGRATIONS; never change a step that a database already ran.
 */

export interface User {
  readonly id: number;
  /** How it signs in: 'google', or 'dev' (development). */
  readonly provider: string;
}

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     provider TEXT NOT NULL,
     subject TEXT NOT NULL,
     email TEXT NOT NULL DEFAULT '',
     name TEXT NOT NULL DEFAULT '',
     created_at INTEGER NOT NULL,
     last_login_at INTEGER NOT NULL,
     UNIQUE (provider, subject)
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   );
   CREATE INDEX sessions_user ON sessions (user_id);
   CREATE TABLE login_states (
     state TEXT PRIMARY KEY,
     verifier TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE characters (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     sheet TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     played_at INTEGER
   );
   CREATE INDEX characters_user ON characters (user_id);`,
  // 2026-10-10: keep less personal data. The sign-in asks for `openid` only, and an account is
  // only the provider's id: the email and the name go.
  `ALTER TABLE users DROP COLUMN email;
   ALTER TABLE users DROP COLUMN name;`,
  // 2026-10-10: where each character was last (JSON: world, x, y), so it starts there again.
  `ALTER TABLE characters ADD COLUMN place TEXT;`,
  // 2026-10-10: what each character carries (JSON: coins, items), from the shared worlds.
  `ALTER TABLE characters ADD COLUMN pack TEXT;`,
];

/** A sign-in state lives this long: the time to choose an account on Google's page. */
export const LOGIN_STATE_MS = 10 * 60 * 1000;

/** The database keeps a hash of each session token, never the token: a copy of the file opens no session. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

interface CharacterRow {
  id: string;
  sheet: string;
  created_at: number;
  played_at: number | null;
  place: string | null;
  pack: string | null;
}

function parse(json: string | null): unknown {
  try {
    return json === null ? null : (JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

function toCharacter(row: CharacterRow): Character | null {
  const check = checkSheet(parse(row.sheet));
  return check.ok
    ? { ...check.sheet, id: row.id, createdAt: row.created_at, playedAt: row.played_at, place: checkPlace(parse(row.place)), pack: checkPack(parse(row.pack)) ?? EMPTY_PACK }
    : null;
}

export class AccountStore {
  private readonly db: DatabaseSync;

  /** `path`: the database file (its folder must exist), or ':memory:' for a test. */
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const { user_version: version } = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    for (let step = version; step < MIGRATIONS.length; step++) {
      this.db.exec('BEGIN');
      try {
        this.db.exec(MIGRATIONS[step]!);
        this.db.exec(`PRAGMA user_version = ${step + 1}`);
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }

  close(): void {
    this.db.close();
  }

  // ---------------------------------------------------------------- people and sessions

  /** The user of a provider's subject (Google's `sub`), made on the first sign-in. */
  signIn(provider: string, subject: string, now: number): User {
    this.db
      .prepare(
        `INSERT INTO users (provider, subject, created_at, last_login_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (provider, subject) DO UPDATE SET last_login_at = excluded.last_login_at`,
      )
      .run(provider, subject, now, now);
    return this.db.prepare('SELECT id, provider FROM users WHERE provider = ? AND subject = ?').get(provider, subject) as unknown as User;
  }

  /** Deletes a user, with its sessions and its characters (ON DELETE CASCADE). */
  deleteUser(userId: number): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  }

  /**
   * A new session for a user; returns its token (only the cookie keeps it). It ends every other
   * session of the user: an account is signed in on one device at a time (Fede's rule, 2026-10-10).
   */
  createSession(userId: number, now: number, lifetimeMs: number): string {
    const token = randomBytes(32).toString('base64url');
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
      this.db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, now, now + lifetimeMs);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return token;
  }

  /** The user of a session token and when the session ends, or null (no such session, or it ended). */
  session(token: string, now: number): { user: User; expiresAt: number } | null {
    const row = this.db
      .prepare('SELECT users.id AS id, users.provider AS provider, sessions.expires_at AS expiresAt FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ?')
      .get(hashToken(token)) as { id: number; provider: string; expiresAt: number } | undefined;
    if (!row) return null;
    if (row.expiresAt <= now) {
      this.endSession(token);
      return null;
    }
    return { user: { id: row.id, provider: row.provider }, expiresAt: row.expiresAt };
  }

  /** Moves the end of a session. */
  extendSession(token: string, expiresAt: number): void {
    this.db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').run(expiresAt, hashToken(token));
  }

  endSession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }

  /** Keeps the state and the PKCE verifier of a sign-in that went to Google. */
  saveLoginState(state: string, verifier: string, now: number): void {
    this.db.prepare('INSERT INTO login_states (state, verifier, created_at) VALUES (?, ?, ?)').run(state, verifier, now);
  }

  /** Takes (and removes) the verifier of a sign-in state, or null if it is unknown or too old. */
  takeLoginState(state: string, now: number): string | null {
    const row = this.db.prepare('SELECT verifier, created_at FROM login_states WHERE state = ?').get(state) as { verifier: string; created_at: number } | undefined;
    if (!row) return null;
    this.db.prepare('DELETE FROM login_states WHERE state = ?').run(state);
    return now - row.created_at <= LOGIN_STATE_MS ? row.verifier : null;
  }

  /** Removes the sessions and the sign-in states that ended. */
  prune(now: number): void {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    this.db.prepare('DELETE FROM login_states WHERE created_at < ?').run(now - LOGIN_STATE_MS);
  }

  // ---------------------------------------------------------------- characters

  /** A user's characters: the last played first, then the newest. */
  characters(userId: number): Character[] {
    const rows = this.db
      .prepare('SELECT id, sheet, created_at, played_at, place, pack FROM characters WHERE user_id = ? ORDER BY played_at IS NULL, played_at DESC, created_at DESC')
      .all(userId) as unknown as CharacterRow[];
    return rows.map(toCharacter).filter((c): c is Character => c !== null);
  }

  character(userId: number, id: string): Character | null {
    const row = this.db.prepare('SELECT id, sheet, created_at, played_at, place, pack FROM characters WHERE user_id = ? AND id = ?').get(userId, id) as CharacterRow | undefined;
    return row ? toCharacter(row) : null;
  }

  /** Stores a new character (a checked sheet). 'limit' when the user has MAX_CHARACTERS already. */
  createCharacter(userId: number, sheet: CharacterSheet, now: number): Character | 'limit' {
    const { count } = this.db.prepare('SELECT COUNT(*) AS count FROM characters WHERE user_id = ?').get(userId) as { count: number };
    if (count >= MAX_CHARACTERS) return 'limit';
    const id = randomBytes(12).toString('hex');
    this.db.prepare('INSERT INTO characters (id, user_id, sheet, created_at, played_at) VALUES (?, ?, ?, ?, NULL)').run(id, userId, JSON.stringify(sheet), now);
    return { ...sheet, id, createdAt: now, playedAt: null, place: null, pack: EMPTY_PACK };
  }

  /** Notes that a character starts to play; returns it, or null if it is not the user's. */
  play(userId: number, id: string, now: number): Character | null {
    const result = this.db.prepare('UPDATE characters SET played_at = ? WHERE user_id = ? AND id = ?').run(now, userId, id);
    return result.changes > 0 ? this.character(userId, id) : null;
  }

  /** Notes where a character is (a checked place); false if it is not the user's. */
  setPlace(userId: number, id: string, place: CharacterPlace): boolean {
    const json = JSON.stringify({ world: place.world, x: place.x, y: place.y });
    return this.db.prepare('UPDATE characters SET place = ? WHERE user_id = ? AND id = ?').run(json, userId, id).changes > 0;
  }

  /** Notes what a character carries (the server's word, from a shared world); false if it is not the user's. */
  setPack(userId: number, id: string, pack: Pack): boolean {
    const json = JSON.stringify({ coins: pack.coins, items: pack.items.map((s) => ({ kind: s.kind, count: s.count })) });
    return this.db.prepare('UPDATE characters SET pack = ? WHERE user_id = ? AND id = ?').run(json, userId, id).changes > 0;
  }

  deleteCharacter(userId: number, id: string): boolean {
    return this.db.prepare('DELETE FROM characters WHERE user_id = ? AND id = ?').run(userId, id).changes > 0;
  }
}
