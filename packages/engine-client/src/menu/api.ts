import type { Character, CharacterSheet } from '@game/engine';

/**
 * The accounts API of the game server (packages/engine-server/src/accounts.ts), on the page's own
 * origin: nginx (or Vite, in development) sends /api/ and /auth/ to the server. The session is an
 * HttpOnly cookie, so this module never sees it.
 */

export interface Me {
  /** How the visitor signed in (the server keeps no name and no email), or null. */
  readonly user: { readonly via: 'google' | 'dev' } | null;
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

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
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
  remove: (id: string) => call<null>('DELETE', `/api/characters/${encodeURIComponent(id)}`),
};
