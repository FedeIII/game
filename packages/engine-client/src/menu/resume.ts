/**
 * A page that reloads itself for a new build (ui/new-build.ts) comes back to the same character:
 * before the reload it notes the character's id for this tab (sessionStorage), and the menu then
 * starts that character at once, without the main screen. The note is good for one start, and only
 * for a short time.
 */

const KEY = 'game.resume.v1';
/** A note older than this is not used (ms). */
const RESUME_MS = 5 * 60_000;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function store(): Store | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Notes the character to start again after the reload. */
export function markResume(characterId: string, storage: Store | null = store(), now = Date.now()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ character: characterId, at: now }));
  } catch {
    // No storage (a private window): the menu shows as usual.
  }
}

/** The character to start again, if a reload noted one a short time ago; the note goes. */
export function takeResume(storage: Store | null = store(), now = Date.now()): string | null {
  try {
    const raw = storage?.getItem(KEY) ?? null;
    if (raw === null) return null;
    storage?.removeItem(KEY);
    const note = JSON.parse(raw) as { character?: unknown; at?: unknown };
    if (typeof note.character !== 'string' || typeof note.at !== 'number' || now - note.at > RESUME_MS || note.at > now) return null;
    return note.character;
  } catch {
    return null;
  }
}
