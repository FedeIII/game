import { isSkin } from '@game/engine';

/** Where the browser keeps the skin seed of a guest (?nomenu): the same look on every visit. */
const KEY = 'game.skin.v1';

/**
 * The skin seed of a guest. ?skin=<n> shows another skin (for tests and previews) and does not
 * change the saved one. Without a saved seed, a new random one is made and saved. If the browser
 * keeps no storage, the guest gets a new skin on each visit. A character of an account has the
 * look of its sheet instead (characterSkin()).
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
