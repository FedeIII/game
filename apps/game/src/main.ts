import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS } from './worlds.ts';

// game.azyr.io: two worlds on one engine. The town is shared through the multiplayer server.
// azyr.io serves this same page as its landing page (see deploy/README.md): there the town of
// Azyr is the default world, and the title names azyr.io.
const landing = location.hostname === 'azyr.io' || location.hostname === 'www.azyr.io';
startGame({ worlds: WORLDS, defaultWorld: landing ? 'town' : DEFAULT_WORLD, title: landing ? 'azyr.io' : 'game.azyr.io' });
