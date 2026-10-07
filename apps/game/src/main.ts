import { startGame } from '@game/engine-client';
import { town } from '@game/world-town';
import { wilds } from '@game/world-wilds';

// game.azyr.io: two worlds on one engine. The wilds stay the default world.
startGame({ worlds: [wilds, town], defaultWorld: 'wilds', title: 'game.azyr.io' });
