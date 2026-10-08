import { cleanName, isSkin } from '@game/engine';

/** Where the browser keeps its skin seed: the same skin on every visit. */
const KEY = 'game.skin.v1';

/**
 * The skin seed of this visitor. ?skin=<n> shows another skin (for tests and previews) and does
 * not change the saved one. Without a saved seed, a new random one is made and saved. If the
 * browser keeps no storage, the visitor gets a new skin on each visit.
 */
export function skinSeed(params: URLSearchParams): number {
  const forced = Number(params.get('skin'));
  if (params.has('skin') && isSkin(forced)) return forced;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null && isSkin(Number(saved))) return Number(saved);
  } catch {
    // No storage (a private window, or storage blocked): a new skin for this visit.
  }
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  try {
    localStorage.setItem(KEY, String(seed));
  } catch {
    // As above.
  }
  return seed;
}

/** A new random skin for this visitor, saved for the next visits (the "New look" button). */
export function newSkinSeed(): number {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  try {
    localStorage.setItem(KEY, String(seed));
  } catch {
    // No storage: the new skin lasts until the page closes.
  }
  return seed;
}

/** Where the browser keeps the visitor's name. */
const NAME_KEY = 'game.name.v1';

/** The visitor's saved name (cleaned), or '' for none. */
export function savedName(): string {
  try {
    return cleanName(localStorage.getItem(NAME_KEY) ?? '');
  } catch {
    return '';
  }
}

/** Saves the visitor's name (cleaned) and returns it as saved. */
export function saveName(name: string): string {
  const clean = cleanName(name);
  try {
    if (clean) localStorage.setItem(NAME_KEY, clean);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // No storage: the name lasts until the page closes.
  }
  return clean;
}
