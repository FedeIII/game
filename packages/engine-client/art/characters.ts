/**
 * The player's wanderer and the NPCs: the figure of figure.ts, rendered from four sides (the
 * player, with an 8-frame walk) or from the front (NPCs). Random player skins use the same
 * figure (skins.ts). Change the proportions in figure.ts, not in the frames.
 */
import { ramp } from './raster.ts';
import { ATTACK_FRAMES, ATTACK_STANCE, attackAction } from './attacks.ts';
import { WANDERER, figure, figureMaterials, type FigureSpec, type Palette } from './figure.ts';
import { renderModel, type Material, type Part } from './sdf.ts';
import type { Frame } from './sprites.ts';

/** All player frames have the same size and anchor, so a texture change never moves the sprite. */
export const PLAYER_FRAME = { width: 32, height: 32, pivotX: 16, pivotY: 30 } as const;
export const WALK_FRAMES = 8;

/** The colours of the player's wanderer: a dark wine cloak over leather. */
export const WANDERER_PALETTE: Palette = {
  cloak: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325', '#7c302e'),
  lining: ramp('#0a0405', '#130708', '#1c0b0c', '#26100f'),
  garment: ramp('#130e0a', '#211810', '#312318', '#432f20', '#563c29'),
  trousers: ramp('#121115', '#1c1a20', '#27242c', '#332f39', '#403b47'),
  boots: ramp('#0b0806', '#150f0b', '#201710', '#2c2016'),
  skin: ramp('#1a110e', '#33221b', '#523a2d', '#73533f', '#93705a'),
  metal: ramp('#101217', '#1f232a', '#333943', '#4b535f', '#6b7581', '#939dab'),
  belt: ramp('#0f0a07', '#1b130d', '#291d14'),
  glove: ramp('#0e0b09', '#1a1410', '#271e17'),
  hair: ramp('#140c08', '#22150d', '#321f13', '#432a1a'),
  hat: ramp('#0c0a0b', '#161315', '#211c1f', '#2d272a'),
  scarf: ramp('#1c1a16', '#2a2721', '#39352d', '#48433a'),
  mask: ramp('#3a3324', '#544a35', '#6e6248', '#8a7d5e'),
};

/** A costume: the colours of the cloak, the jerkin and the hair, and the hood up or down. */
interface Look {
  readonly cloak: readonly number[];
  readonly hood: boolean;
  readonly hair?: readonly number[];
  readonly leather?: readonly number[];
  /** Other parts of the figure than the wanderer's (a helm, a beard, a staff, a small body). */
  readonly spec?: Partial<FigureSpec>;
  /** Other colours than the wanderer's, for the other slots. */
  readonly palette?: Partial<Palette>;
}

/** The figure and the colours of an NPC look: the wanderer with the look's colours in place. */
function npcFigure(look: Look): { spec: FigureSpec; materials: Material[] } {
  const palette: Palette = {
    ...WANDERER_PALETTE,
    cloak: look.cloak,
    lining: look.cloak.slice(0, 4),
    ...(look.hair ? { hair: look.hair } : {}),
    ...(look.leather ? { garment: look.leather } : {}),
    ...look.palette,
  };
  return { spec: { ...WANDERER, headwear: look.hood ? 'hood' : 'bare', ...look.spec }, materials: figureMaterials(palette) };
}

const HAIR = {
  grey: ramp('#2a2a2c', '#46464a', '#66666a', '#8a8a8e'),
  chestnut: ramp('#1e0f08', '#33190d', '#4c2714', '#64351c'),
  black: ramp('#08080a', '#121216', '#1c1c22', '#28282f'),
  dark: ramp('#140c08', '#22150d', '#321f13', '#432a1a'),
  blond: ramp('#3a2c12', '#5e4a1e', '#86702e', '#b09842'),
};

/**
 * The looks of NPCs (frames `npc/<look>`, standing, facing south). Worlds pick a look by name;
 * add a look here to give a new character a costume.
 */
export const NPC_LOOKS: Record<string, Look> = {
  treasurer: { cloak: ramp('#08140d', '#0d2014', '#132c1c', '#1a3a25', '#234a30', '#2e5c3c'), hood: false, hair: HAIR.grey },
  healer: { cloak: ramp('#2a2722', '#3e3a33', '#555046', '#6e685b', '#888170', '#a29a86'), hood: true },
  bard: { cloak: ramp('#140a18', '#211028', '#30183a', '#40214d', '#522b60', '#653875'), hood: false, hair: HAIR.chestnut },
  dungeonmaster: { cloak: ramp('#120c08', '#20160e', '#2f2015', '#3f2b1c', '#503724', '#62442d'), hood: true },
  spymaster: { cloak: ramp('#060608', '#0c0c10', '#131318', '#1b1b22', '#24242c', '#2e2e38'), hood: true },
  gamer: { cloak: ramp('#080c18', '#0e1426', '#141d36', '#1b2747', '#233259', '#2d3f6c'), hood: false, hair: HAIR.black },
  smith: {
    cloak: ramp('#160a06', '#26110a', '#37190e', '#4a2213', '#5d2c18', '#71371e'),
    hood: false,
    hair: HAIR.dark,
    leather: ramp('#1c120a', '#2e1e10', '#422c18', '#583b21', '#6e4a2b'),
  },
  archivist: { cloak: ramp('#0d1014', '#151a20', '#1e252d', '#28303a', '#333d49', '#3f4b59'), hood: true },
  crier: { cloak: ramp('#14070a', '#260c10', '#3a1216', '#501a1d', '#662325', '#7c302e'), hood: false, hair: HAIR.blond },
  // The people of Thornwick (worlds/wilds, town.ts).
  /** A town guard: a helm, mail, a short cloak and a tabard in the town's dark red, a sword. */
  watchman: {
    cloak: ramp('#16080a', '#240d10', '#341316', '#45191c', '#572023', '#69282a'),
    hood: false,
    hair: HAIR.dark,
    spec: { headwear: 'helm', body: 'armour', cloak: 'short', tabard: true, item: 'sword', beard: true },
  },
  /** A stout innkeeper with a long beard and a leather apron, no cloak. */
  innkeeper: {
    cloak: ramp('#120c08', '#20160e', '#2f2015', '#3f2b1c', '#503724', '#62442d'),
    hood: false,
    hair: HAIR.chestnut,
    leather: ramp('#1c120a', '#2e1e10', '#422c18', '#583b21', '#6e4a2b'),
    spec: { build: 1.18, cloak: 'none', beard: true, beardLength: 2, pauldrons: false, pouch: true },
  },
  /** A priest in a pale robe and a cowl, with a staff. */
  priest: {
    cloak: ramp('#1e1c18', '#2f2c26', '#433f37', '#5a554b', '#736d60', '#8c8576'),
    hood: false,
    spec: { headwear: 'cowl', body: 'robe', pauldrons: false, item: 'staff' },
  },
  /** A child: small, with a big head and a short cloak. */
  child: {
    cloak: ramp('#141008', '#221b0e', '#332915', '#45381d', '#584826', '#6b5930'),
    hood: false,
    hair: HAIR.blond,
    spec: { height: 0.7, build: 0.82, head: 1.15, cloak: 'short', pauldrons: false },
  },
};

/**
 * One view for each facing. Left is a real render, not a mirror of right: a mirror would also
 * mirror the light, which comes from the top left for all art.
 */
export const VIEWS = [
  { name: 'down', yaw: 0 },
  { name: 'up', yaw: Math.PI },
  { name: 'right', yaw: Math.PI / 2 },
  { name: 'left', yaw: -Math.PI / 2 },
] as const;

/** Frames `player/<view>/stand`, `player/<view>/walk/<i>` and `player/<view>/attack/<i>` (a punch): the wanderer, the default player. */
export function playerFrames(): Frame[] {
  const anchor = { x: PLAYER_FRAME.pivotX / PLAYER_FRAME.width, y: PLAYER_FRAME.pivotY / PLAYER_FRAME.height };
  const materials = figureMaterials(WANDERER_PALETTE);
  const frames: Frame[] = [];
  for (const view of VIEWS) {
    const render = (parts: Part[]) => renderModel(parts, materials, { ...PLAYER_FRAME, yaw: view.yaw });
    frames.push({ name: `player/${view.name}/stand`, image: render(figure(WANDERER, 0, 0)), anchor });
    for (let i = 0; i < WALK_FRAMES; i++) {
      frames.push({ name: `player/${view.name}/walk/${i}`, image: render(figure(WANDERER, (i / WALK_FRAMES) * 2 * Math.PI, 1)), anchor });
    }
    for (let i = 0; i < ATTACK_FRAMES; i++) {
      const [phase, amount] = ATTACK_STANCE[i]!;
      frames.push({ name: `player/${view.name}/attack/${i}`, image: render(figure(WANDERER, phase, amount, attackAction('punch', i, WANDERER))), anchor });
    }
  }
  return frames;
}

/**
 * The frames of each NPC look, with the player's frame size and anchor: `npc/<look>` (standing,
 * facing south, for an NPC that stands still as a fixture), and for walking NPCs
 * `npc/<look>/<view>/stand` and `npc/<look>/<view>/walk/<i>`.
 */
export function npcFrames(): Frame[] {
  const anchor = { x: PLAYER_FRAME.pivotX / PLAYER_FRAME.width, y: PLAYER_FRAME.pivotY / PLAYER_FRAME.height };
  const frames: Frame[] = [];
  for (const [name, look] of Object.entries(NPC_LOOKS)) {
    const { spec, materials } = npcFigure(look);
    frames.push({ name: `npc/${name}`, image: renderModel(figure(spec, 0, 0), materials, { ...PLAYER_FRAME, yaw: 0 }), anchor });
    for (const view of VIEWS) {
      const render = (parts: Part[]) => renderModel(parts, materials, { ...PLAYER_FRAME, yaw: view.yaw });
      frames.push({ name: `npc/${name}/${view.name}/stand`, image: render(figure(spec, 0, 0)), anchor });
      for (let i = 0; i < WALK_FRAMES; i++) {
        frames.push({ name: `npc/${name}/${view.name}/walk/${i}`, image: render(figure(spec, (i / WALK_FRAMES) * 2 * Math.PI, 1)), anchor });
      }
    }
  }
  return frames;
}
