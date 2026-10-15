/**
 * A page that reloads itself for a new build (ui/new-build.ts) comes back to the same character:
 * before the reload it notes the character's id for this tab (sessionStorage), and the menu then
 * starts that character at once, without the main screen (in the sandbox of an admin if it was
 * there). The note is good for one start, and only for a short time. The game menu
 * (ui/game-menu.ts) notes a screen of the menu in the same way.
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

/** The character to start again after a reload, and whether it was in the sandbox of an admin (sandbox.ts). */
export interface ResumeNote {
  readonly character: string;
  readonly sandbox: boolean;
}

/** Notes the character to start again after the reload (in the sandbox, if `sandbox`). */
export function markResume(characterId: string, sandbox = false, storage: Store | null = store(), now = Date.now()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ character: characterId, at: now, ...(sandbox ? { sandbox: true } : {}) }));
  } catch {
    // No storage (a private window): the menu shows as usual.
  }
}

/** The character to start again, if a reload noted one a short time ago; the note goes. */
export function takeResume(storage: Store | null = store(), now = Date.now()): ResumeNote | null {
  try {
    const raw = storage?.getItem(KEY) ?? null;
    if (raw === null) return null;
    storage?.removeItem(KEY);
    const note = JSON.parse(raw) as { character?: unknown; at?: unknown; sandbox?: unknown };
    if (typeof note.character !== 'string' || typeof note.at !== 'number' || now - note.at > RESUME_MS || note.at > now) return null;
    return { character: note.character, sandbox: note.sandbox === true };
  } catch {
    return null;
  }
}

/**
 * The screen of the menu that the game menu asks for (ui/game-menu.ts): the list of characters, the
 * builder, or the list of characters for the sandbox of an admin.
 */
export type MenuScreen = 'load' | 'new' | 'sandbox';

const SCREENS: readonly MenuScreen[] = ['load', 'new', 'sandbox'];

const SCREEN_KEY = 'game.menu-screen.v1';

/** Notes the screen of the menu to show after the reload ("Load game", "New game", "Sandbox"). */
export function markMenuScreen(screen: MenuScreen, storage: Store | null = store(), now = Date.now()): void {
  try {
    storage?.setItem(SCREEN_KEY, JSON.stringify({ screen, at: now }));
  } catch {
    // No storage: the menu shows its main screen.
  }
}

/** The screen of the menu to show, if the game menu noted one a short time ago; the note goes. */
export function takeMenuScreen(storage: Store | null = store(), now = Date.now()): MenuScreen | null {
  try {
    const raw = storage?.getItem(SCREEN_KEY) ?? null;
    if (raw === null) return null;
    storage?.removeItem(SCREEN_KEY);
    const note = JSON.parse(raw) as { screen?: unknown; at?: unknown };
    const screen = SCREENS.find((s) => s === note.screen);
    if (!screen || typeof note.at !== 'number' || now - note.at > RESUME_MS || note.at > now) return null;
    return screen;
  } catch {
    return null;
  }
}
