import { town } from '@game/world-town';
import { wilds } from '@game/world-wilds';

/**
 * The worlds of game.azyr.io. The page (main.ts) and the multiplayer server (server/main.ts)
 * both read this list, so they always agree on the worlds. The wilds stay the default world.
 */
export const WORLDS = [wilds, town];
export const DEFAULT_WORLD = 'wilds';
