import type { Fixture, Lore } from '@game/engine';
import { TEAR_TAKEN } from './quests.ts';
import { SILVERSPRING_SITE } from './road.ts';

/**
 * The shrine of Tigris (story phase 9; "Shadows of the Ashen Seekers", phase 5, "Indirect
 * Confrontation"): old standing stones round the pool of the Silvervein (river.ts), and an altar of
 * the old kind on its south bank. Tigris is the goddess of the rivers in Kandrax (`Kandrax -
 * Dioses`), an avatar of the god of matter who both makes and breaks. The stones of the Wrens came
 * from here.
 *
 * A character at `captive` with the wave stone puts it into the altar (a variant of the altar): it
 * takes the stone and gives the Tear of Tigris (TEAR_TAKEN). Then the Ash Warden comes for it (source.ts,
 * the ambush SHRINE).
 *
 * The stones and the altar are loose things of the woods (not a place of the town builder): they
 * stand on the bank of the pool, and the river keeps its water round them.
 */

/** A tile at (dx, dy) from the site of Silverspring (road.ts): the shrine is south of the town, at the pool of its river. */
const near = (dx: number, dy: number) => [SILVERSPRING_SITE.tx + dx, SILVERSPRING_SITE.ty + dy] as const;

/** The altar: on the south bank of the pool, two tiles wide (its anchor is the west tile). */
export const ALTAR_TILE = near(24, 69);

const ALTAR: Fixture = {
  kind: 'altar',
  tx: ALTAR_TILE[0],
  ty: ALTAR_TILE[1],
  content: {
    pages: ['An altar of the old kind, half sunk in the mud of the bank. Waves are carved round its sides. In its top, a hollow for a flat stone.'],
    lore: [{ gate: { ability: 'int', dc: 14 }, pages: ['The carvings are older than the chapel of Ironhold, older than the Enclave. A name runs round the hollow: TIGRIS.'] }],
  },
  // For a character sent by Sela, with the wave stone: the stone fits the hollow, and the Tear is there.
  variant: {
    when: [{ quest: 'ashes', at: ['captive'] }, { has: 'wave-stone' }],
    frame: 'fixture/altar',
    content: {
      pages: ['The wave stone fits the hollow of the altar, groove for groove.', 'The pool draws back from the bank with a long sigh. On the altar lies a drop of clear crystal in silver: the Tear of Tigris.'],
      effect: TEAR_TAKEN,
    },
  },
};

/** The standing stones round the pool, on its bank (none on the north side, where the river comes in). */
const STONE_TILES: readonly (readonly [number, number])[] = [near(31, 63), near(30, 66), near(28, 68), near(21, 68), near(19, 66), near(18, 63), near(19, 60), near(30, 60)];

const STONE_PAGES = ['A standing stone, taller than a man, carved with waves.'];
/** One stone says more to a character with INT 14: Tigris both makes and breaks (Kandrax). */
const STONE_LORE: readonly Lore[] = [{ gate: { ability: 'int', dc: 14 }, pages: ['Under the waves, worn smooth: "Tigris gives and Tigris takes. The river feeds the field, and the river drowns the town."'] }];

/** The things of the shrine: the altar and the standing stones. */
export const SHRINE_FIXTURES: readonly Fixture[] = [
  ALTAR,
  ...STONE_TILES.map(([tx, ty], i): Fixture => ({ kind: 'menhir', tx, ty, content: { pages: STONE_PAGES, ...(i === 2 ? { lore: STONE_LORE } : {}) } })),
];

/** The rectangle of the shrine (tiles): no tree grows in it or next to it, and no herbs. */
export const SHRINE_RECT = { x0: near(18, 0)[0], y0: near(0, 60)[1], x1: near(31, 0)[0], y1: near(0, 69)[1] } as const;
