import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS, shareWorlds } from './worlds.ts';

/** The worlds that this build shares (SHARED_WORLDS, see vite.config.ts); empty in production. */
declare const __SHARED_WORLDS__: string;

// game.azyr.io: the game. Only this site serves this page; azyr.io has the Town of Azyr, from
// its own copy of the engine (the branch town).
startGame({ worlds: shareWorlds(WORLDS, __SHARED_WORLDS__), defaultWorld: DEFAULT_WORLD, title: 'game.azyr.io' });
