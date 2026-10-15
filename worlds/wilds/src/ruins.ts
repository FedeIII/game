import { Ground, type Dialog, type Lore, type NpcDef, type QuestEffect } from '@game/engine';
import { SURVIVOR_HALE, SURVIVOR_TANNER } from './dialogs.ts';
import { RUIN_HALE, RUIN_MARROW, RUIN_TANNER } from './quests.ts';
import { Town, type Tile } from './towns.ts';

/**
 * The burned homesteads (story phase 6; "Shadows of the Ashen Seekers", phase 1, in the `RPG` notes
 * of Kandrax): three houses of the Wilds that the Ashen Seekers burned since the spring. Each one is
 * a shell of charred planks with no roof, and in each one their sign is burned into a plank: a
 * phoenix that rises from ashes. Each phoenix moves the quest `ashes` on, in order: the reeve names
 * the Hale homestead, north of Ironhold; its tracks lead east to the Marrow homestead, and those to
 * the Tanner homestead, south-west. All three are in the wildlands north of Ironhold (Fede,
 * 2026-10-13: where Thrain's letter says that homesteads burn). A survivor lives in the ashes of two of them: it saw only shadows
 * (Wisdom 11 calms it, and it tells more).
 *
 * Places of the town builder (towns.ts), but not towns: mobs come here as in the woods. No tree or
 * rock grows round them (source.ts).
 *
 *   .  grass    1  the burned house
 */
const MAP = [
  '...........',
  '...........',
  '..1111111..',
  '..1111111..',
  '..1111111..',
  '..1111111..',
  '..1111111..',
  '..1111111..',
  '...........',
  '...........',
  '...........',
];

/** The phoenix on its plank: what it says, and what reading it does. */
const BRAND_PAGES = ['A plank, charred black. Burned into it, deeper than the rest: a phoenix that rises from ashes.'];
const BRAND_LORE: readonly Lore[] = [{ gate: { ability: 'int', dc: 14 }, pages: ['The burn is too clean for a torch, and the soot is cold. Magic made this mark, old magic: it still smells of thunder.'] }];

/** A burned homestead, with its north-west tile at (x0, y0), its phoenix, and a line for each of its other things. */
function ruin(id: string, name: string, x0: number, y0: number, effect: QuestEffect, lines: { readonly shelf: string; readonly chest: string; readonly crate: string }): Town {
  return new Town({
    name,
    x0,
    y0,
    map: MAP,
    buildings: [
      {
        id: `ruin-${id}`,
        style: { walls: 'charred', roof: 'none' },
        floor: Ground.FloorEarth,
        plan: ['#######', '#s..m.#', '#.....#', '#c...x#', '#.....#', '###D###'],
        things: {
          s: { kind: 'bookshelf', pages: [lines.shelf] },
          m: { kind: 'brand', pages: BRAND_PAGES, lore: BRAND_LORE, effect },
          c: { kind: 'chest', pages: [lines.chest] },
          x: { kind: 'crate', pages: [lines.crate] },
        },
      },
    ],
    things: {},
  });
}

export const HALE = ruin('hale', 'the Hale homestead', -35, -45, RUIN_HALE, {
  shelf: 'Ash, and the spines of books. Every book was opened before the fire.',
  chest: 'Its lid is torn off. Empty.',
  crate: 'Burned through. Someone kicked it over first.',
});
export const MARROW = ruin('marrow', 'the Marrow homestead', 2, -50, RUIN_MARROW, {
  shelf: 'The shelves were pulled from the wall, and then they burned.',
  chest: 'Empty. The boards of its bottom were pried up.',
  crate: 'Seed grain, black and spilled.',
});
export const TANNER = ruin('tanner', 'the Tanner homestead', -66, -30, RUIN_TANNER, {
  shelf: 'Tools of a tanner, black with soot.',
  chest: 'Empty, and the hearthstone beside it is lifted.',
  crate: 'Hides, burned stiff.',
});

/** The burned homesteads, in the order of the tracks. */
export const RUINS: readonly Town[] = [HALE, MARROW, TANNER];

/** The tile of the phoenix of a ruin (the map marks it). */
export function brandTile(ruin: Town): Tile {
  return ruin.at(6, 3);
}

/** The grass round a ruin, south of the house: where its survivor walks. */
function yard(ruin: Town): Tile[] {
  const out: Tile[] = [];
  for (let r = 8; r <= 10; r++) for (let c = 0; c <= 10; c++) if (c !== 5 || r > 8) out.push(ruin.at(c, r));
  return out;
}

const survivor = (id: string, ruin: Town, dialog: Dialog, barks: readonly string[]): NpcDef => ({
  id,
  look: 'survivor',
  home: ruin.at(2, 9),
  area: yard(ruin),
  content: { speaker: 'fixture', dialog },
  barks,
});

/** The survivors in the ashes of the Hale and the Tanner homesteads. Their order is their code on the wire: add new people at the end. */
export const RUIN_NPCS: readonly NpcDef[] = [
  survivor('hale-survivor', HALE, SURVIVOR_HALE, ['Shadows... only shadows.', 'Father built this house.', 'Who is there?']),
  survivor('tanner-survivor', TANNER, SURVIVOR_TANNER, ['Mother? ...No.', 'A bird of fire.', 'I am not crying.']),
];
