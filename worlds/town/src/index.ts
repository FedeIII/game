import type { WorldDefinition } from '@game/engine';
import { TownSource } from './source.ts';

export { BOUNDS, HOUSES, NPCS, OUTDOOR, SPAWN, floorOf } from './layout.ts';
export { PROJECTS, type Exhibit, type House, type Project } from './projects.ts';
export { TownSource } from './source.ts';

/**
 * The town of Azyr: a small plaza and a lane with eight houses, one for each project of the
 * azyr.io landing page. Each house has its own size and style. In each house a keeper introduces
 * the project, the exhibits show its details, and a portal links to the real thing. It is dusk
 * here, not night: less dark than the wilds.
 */
export const town: WorldDefinition = {
  id: 'town',
  name: 'Town of Azyr',
  createSource: () => new TownSource(),
  examine: {
    tree: "It's a tree",
    rock: "It's a rock",
    fountain: 'The water is still. Coins glint at the bottom.',
    lamppost: 'An iron lamp. Its flame never wavers.',
    barrel: 'A barrel of rainwater.',
    crate: 'A crate, nailed shut.',
  },
  darkness: 0.6,
  // Every visitor sees the others here: the town is the shared world of game.azyr.io.
  multiplayer: true,
  // On arrival: the name of the town, and then the crier explains the town.
  intro: {
    title: 'Town of Azyr',
    speaker: 'crier',
    welcome: [
      'Welcome to the town of Azyr, traveller!',
      'Each house here holds one of the projects of Azyr.',
      'Walk in, talk to the keepers, and look at what they show.',
      'The portal in each house leads to the real project.',
      'The notice board by the fountain lists them all.',
      'And other visitors walk these streets too. Good journey!',
    ],
  },
};
