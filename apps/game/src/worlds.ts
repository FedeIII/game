import { wilds } from '@game/world-wilds';

/**
 * The worlds of game.azyr.io. The page (main.ts) and the multiplayer server (server/main.ts)
 * both read this list, so they always agree on the worlds. Since 2026-10-09 the game has the
 * Wilds only: the Town of Azyr went to azyr.io, as a frozen copy (the branch town).
 */
export const WORLDS = [wilds];
export const DEFAULT_WORLD = 'wilds';
