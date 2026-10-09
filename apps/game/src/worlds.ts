import { wilds } from '@game/world-wilds';

/**
 * The worlds of game.azyr.io. The page (main.ts) and the multiplayer server (server/main.ts)
 * both read this list, so they always agree on the worlds. Since 2026-10-09 the game has the
 * Wilds only: the Town of Azyr went to azyr.io, as a frozen copy (the branch town).
 */
export const WORLDS = [wilds];
export const DEFAULT_WORLD = 'wilds';

/**
 * The worlds, with each world of `ids` (comma-separated) as a shared world (`multiplayer: true`).
 * The local dev environment (scripts/dev.sh) sets SHARED_WORLDS=wilds for the page and for the
 * server, so that both share the Wilds before game.azyr.io does. Production sets nothing: then the
 * worlds stay as they are.
 */
export function shareWorlds(worlds: typeof WORLDS, ids: string): typeof WORLDS {
  const shared = new Set(ids.split(',').map((id) => id.trim()).filter(Boolean));
  return worlds.map((world) => (shared.has(world.id) ? { ...world, multiplayer: true } : world));
}
