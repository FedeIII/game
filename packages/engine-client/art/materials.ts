/**
 * Materials of the SDF art that buildings and fixtures share: stone, wood, metal, cloth, and the
 * glowing things (flame, glass). Index a material with M.<name>.
 */
import { ramp } from './raster.ts';
import type { Material } from './sdf.ts';

export function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x61c88647);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- materials

export const M = {
  stoneA: 0,
  stoneB: 1,
  stoneC: 2,
  mortar: 3,
  cap: 4,
  moss: 5,
  wood: 6,
  woodDark: 7,
  metal: 8,
  linen: 9,
  wine: 10,
  wax: 11,
  flame: 12,
  bookRed: 13,
  bookGreen: 14,
  bookBlue: 15,
  bookBrown: 16,
  gold: 17,
  parchment: 18,
  lanternGlass: 19,
  water: 20,
  mirror: 21,
  glow: 22,
  ivory: 23,
  dieRed: 24,
  pieceBlack: 25,
  bottleGreen: 26,
  bottleRed: 27,
  bottleAmber: 28,
  iron: 29,
} as const;

export const MATERIALS: Material[] = [
  { ramp: ramp('#121110', '#1b1917', '#252220', '#302c29', '#3c3833', '#4a453f'), dither: true },
  { ramp: ramp('#141110', '#1f1a17', '#2a231f', '#352d27', '#423830', '#51463c'), dither: true },
  { ramp: ramp('#101113', '#191b1e', '#232529', '#2e3135', '#3a3e43', '#484d53'), dither: true },
  { ramp: ramp('#0a0908', '#100f0e', '#171513', '#1e1b18') },
  { ramp: ramp('#161514', '#211f1d', '#2d2a27', '#3a3632', '#48433e', '#58524b'), dither: true },
  { ramp: ramp('#0c120b', '#121c10', '#192615', '#21311b', '#2b3f22'), dither: true },
  { ramp: ramp('#110c09', '#1b130e', '#261b13', '#32241a', '#3f2e21', '#4d392a') },
  { ramp: ramp('#0b0806', '#130d09', '#1c140e', '#251a12') },
  { ramp: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581') },
  { ramp: ramp('#1f1d1a', '#2e2b27', '#3f3b35', '#524d45', '#665f55') },
  { ramp: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325') },
  { ramp: ramp('#4a4436', '#655d4a', '#837a62', '#a0967b') },
  { ramp: ramp('#c8822e', '#f0b04a', '#ffe08a'), bias: 1 },
  { ramp: ramp('#1a0809', '#2e0f11', '#431618', '#582020') },
  { ramp: ramp('#0a120d', '#111f16', '#192c20', '#22392a') },
  { ramp: ramp('#0c0f18', '#141a29', '#1d253a', '#28304a') },
  { ramp: ramp('#160f09', '#24180f', '#332316', '#422e1d') },
  { ramp: ramp('#3a2a0c', '#5e4512', '#8a681c', '#b48c2c', '#d8b44a', '#f0d77a') }, // gold
  { ramp: ramp('#3a3324', '#544a35', '#6e6248', '#8a7d5e', '#a29573') }, // parchment
  { ramp: ramp('#c8822e', '#f0b04a', '#ffe08a'), bias: 0.6 }, // lantern glass, lit from inside
  { ramp: ramp('#070d10', '#0d171c', '#142229', '#1d313a', '#2c4652', '#5a7f8c'), dither: true }, // water
  { ramp: ramp('#1c2a3a', '#2c4258', '#466684', '#6c90b0', '#a6c4dc'), bias: 0.35 }, // mirror
  { ramp: ramp('#bfc6cc', '#e2e8ec', '#ffffff'), bias: 1 }, // glow (tinted by the client)
  { ramp: ramp('#5e5a4e', '#827d6c', '#a7a18c', '#c9c3ab') }, // ivory: dice, pieces
  { ramp: ramp('#3a0e10', '#5c1618', '#822224', '#a8302e') }, // red die
  { ramp: ramp('#0a0a0c', '#141418', '#202026', '#2e2e36') }, // black piece
  { ramp: ramp('#0e2416', '#164024', '#21603a', '#3a8c58'), bias: 0.25 }, // green bottle
  { ramp: ramp('#2a0a0e', '#4a1218', '#741c24', '#a83438'), bias: 0.25 }, // red bottle
  { ramp: ramp('#3a220a', '#5e3810', '#8a5418', '#c07a24'), bias: 0.25 }, // amber bottle
  { ramp: ramp('#0b0c0f', '#15171c', '#20232a', '#2d3139', '#3d424c') }, // iron
];
