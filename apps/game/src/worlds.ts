import { town } from '@game/world-town';

/**
 * The worlds of azyr.io: the Town of Azyr only. The page (main.ts) and the multiplayer server
 * (server/main.ts) both read this list, so they always agree on the worlds.
 */
export const WORLDS = [town];
export const DEFAULT_WORLD = 'town';
