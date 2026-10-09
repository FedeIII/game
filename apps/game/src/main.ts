import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS } from './worlds.ts';

// game.azyr.io: the game. Only this site serves this page; azyr.io has the Town of Azyr, from
// its own copy of the engine (the branch town, /opt/azyr-town).
startGame({ worlds: WORLDS, defaultWorld: DEFAULT_WORLD, title: 'game.azyr.io' });
