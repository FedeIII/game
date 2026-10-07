import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS } from './worlds.ts';

// game.azyr.io: two worlds on one engine. The town is shared through the multiplayer server.
startGame({ worlds: WORLDS, defaultWorld: DEFAULT_WORLD, title: 'game.azyr.io' });
