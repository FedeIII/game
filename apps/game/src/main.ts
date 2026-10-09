import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS } from './worlds.ts';

// The landing page of azyr.io: the Town of Azyr, shared through the multiplayer server.
startGame({ worlds: WORLDS, defaultWorld: DEFAULT_WORLD, title: 'azyr.io' });
