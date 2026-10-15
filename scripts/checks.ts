/**
 * Prints the register of the checks of the game (docs/features/abilities/checks.md): every gate of the
 * Wilds and of the page, with its ability, its DC and its context, as a Markdown table. Read it before
 * you choose or change a DC, so that a new check fits the others.
 *
 *   npm run checks
 */
import { DEFAULT_SEED, WildsSource, checksOf, checksTable, type CheckEntry } from '../worlds/wilds/src/index.ts';
import { HOMEWARD_GATE, MAP_HOUSES, MAP_NAMES, MAP_SECRETS, READ_FOE_GATE, READ_OPENING_GATE, REPUTATION_GATE } from '../packages/engine-client/src/ui/gates.ts';

const page: CheckEntry[] = [
  { ...READ_FOE_GATE, kind: 'page', where: 'the page', text: 'read a mob: its health bar' },
  { ...READ_OPENING_GATE, kind: 'page', where: 'the page', text: 'read a mob: the glint of its wind-up' },
  { ability: 'int', dc: MAP_HOUSES, kind: 'page', where: 'the map', text: 'the houses and the roads' },
  { ability: 'int', dc: MAP_NAMES, kind: 'page', where: 'the map', text: 'the names and the refuges' },
  { ability: 'int', dc: MAP_SECRETS, kind: 'page', where: 'the map', text: 'the barred houses and the locked chests' },
  { ...HOMEWARD_GATE, kind: 'page', where: 'the page', text: 'an arrow to the home at the edge of the screen' },
  { ...REPUTATION_GATE, kind: 'page', where: 'the page', text: 'the people greet the character by name' },
];

console.log(checksTable([...checksOf(new WildsSource(DEFAULT_SEED)), ...page]));
