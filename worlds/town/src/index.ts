import type { WorldDefinition } from '@game/engine';
import { TownSource } from './source.ts';

export { BOUNDS, HOUSES, OUTDOOR, SPAWN, STREETS } from './layout.ts';
export { PROJECTS, type Exhibit, type Project, type Slot } from './projects.ts';
export { TownSource } from './source.ts';

/**
 * The town of Azyr: a plaza and eight houses, one for each project of the azyr.io landing page.
 * In each house a keeper introduces the project, the exhibits show its details, and a portal
 * links to the real thing. It is dusk here, not night: less dark than the wilds.
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
  },
  darkness: 0.6,
};
