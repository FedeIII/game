import type { Character, CharacterPlace, CharacterSheet } from '@game/engine';

/**
 * The accounts API of the game server (packages/engine-server/src/accounts.ts), on the page's own
 * origin: nginx (or Vite, in development) sends /api/ and /auth/ to the server. The session is an
 * HttpOnly cookie, so this module never sees it.
 */

export interface Me {
  /** How the visitor signed in, and if it is an admin (it sees the display settings), or null. */
  readonly user: { readonly via: 'google' | 'dev'; readonly admin: boolean } | null;
  readonly login: { readonly google: boolean; readonly dev: boolean };
}

/** A failed request: `status` 0 means that the server did not answer. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
  }
}

let leaving = false;

/**
 * The session of the page ended: a sign-in on another device ends it (an account is signed in on
 * one device at a time). The page goes back to the sign-in screen, which says why (?login=elsewhere).
 */
export function backToSignIn(): void {
  if (leaving) return;
  leaving = true;
  const params = new URLSearchParams(location.search);
  params.set('login', 'elsewhere');
  location.replace(`${location.pathname}?${params}${location.hash}`);
}

/** `keepalive`: the request goes on when the page closes (a small body only). A 401 means that the session ended. */
async function call<T>(method: string, path: string, body?: unknown, keepalive = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      keepalive,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // nginx without the /api/ route answers with the page: not JSON.
    throw new ApiError(response.ok ? 502 : response.status, 'not json');
  }
  if (response.status === 401) backToSignIn();
  if (!response.ok) throw new ApiError(response.status, String((data as { error?: unknown } | null)?.error ?? response.status));
  return data as T;
}

export const api = {
  me: () => call<Me>('GET', '/api/me'),
  /** Goes to Google's page; the server sends the visitor back to the page, signed in. */
  signInWithGoogle: (): void => {
    location.assign('/auth/google');
  },
  devSignIn: (name: string) => call<{ user: Me['user'] }>('POST', '/auth/dev', { name }),
  signOut: () => call<null>('POST', '/auth/logout'),
  /** Deletes the account, its sessions and its characters. */
  deleteAccount: () => call<null>('DELETE', '/api/me'),
  characters: async () => (await call<{ characters: Character[] }>('GET', '/api/characters')).characters,
  create: async (sheet: CharacterSheet) => (await call<{ character: Character }>('POST', '/api/characters', sheet)).character,
  play: async (id: string) => (await call<{ character: Character }>('POST', `/api/characters/${encodeURIComponent(id)}/play`)).character,
  /** Notes where the character is (a world that the page runs). `keepalive` while the page closes. */
  place: (id: string, place: CharacterPlace, keepalive = false) => call<null>('PUT', `/api/characters/${encodeURIComponent(id)}/place`, place, keepalive),
  remove: (id: string) => call<null>('DELETE', `/api/characters/${encodeURIComponent(id)}`),
};
