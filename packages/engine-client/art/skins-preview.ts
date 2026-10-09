/**
 * Contact sheets of player skins, to look at the art: `node art/skins-preview.ts <folder>`.
 * It writes one sheet per race (a row per gender, a column per class, the figure at rest and
 * facing south), sheets of variants of one look, of the four views and of the attack frames,
 * all at 4x on a dark ground. Not part of the build.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLASSES, GENDERS, RACES, appearanceSeed, type Appearance } from '@game/engine';
import { ATTACK_STANCE, attackAction } from './attacks.ts';
import { figure, figureMaterials } from './figure.ts';
import { Image, encodePng, upscale } from './png.ts';
import { renderModel } from './sdf.ts';
import { SKIN_ATTACK_FRAMES, SKIN_FRAME, SKIN_PORTRAIT, SKIN_VIEWS, describeSkin, skinAttack, skinFromSeed, type Skin } from './skins.ts';

const GROUND = 0x1a1614ff;
const SCALE = 4;

function fill(image: Image, rgba: number): void {
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) image.set(x, y, rgba);
}

/** One frame of a skin: the stand (frame -1) or an attack frame, in one view. */
function frame(skin: Skin, yaw: number, attack = -1): Image {
  const materials = figureMaterials(skin.palette);
  if (attack < 0) return renderModel(figure(skin.spec, 0, 0), materials, { ...SKIN_FRAME, yaw });
  const [phase, amount] = ATTACK_STANCE[attack]!;
  return renderModel(figure(skin.spec, phase, amount, attackAction(skinAttack(skin), attack, skin.spec)), materials, { ...SKIN_FRAME, yaw });
}

/** A grid of cells; `cell(column, row)` gives a frame, and `crop` the part of it to keep. */
function grid(columns: number, rows: number, crop: { x: number; y: number; width: number; height: number }, cell: (column: number, row: number) => Image | null, scale = SCALE): Image {
  const pad = 2;
  const sheet = new Image(columns * (crop.width + pad) + pad, rows * (crop.height + pad) + pad);
  fill(sheet, 0x0b0909ff);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const image = cell(column, row);
      const x0 = pad + column * (crop.width + pad);
      const y0 = pad + row * (crop.height + pad);
      for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) sheet.set(x0 + x, y0 + y, GROUND);
      if (!image) continue;
      for (let y = 0; y < crop.height; y++) {
        for (let x = 0; x < crop.width; x++) {
          const rgba = image.get(crop.x + x, crop.y + y);
          if ((rgba & 0xff) !== 0) sheet.set(x0 + x, y0 + y, rgba);
        }
      }
    }
  }
  return upscale(sheet, scale);
}

const out = process.argv[2] ?? '.';
mkdirSync(out, { recursive: true });
const save = (name: string, image: Image) => writeFileSync(join(out, name), encodePng(image));
const seedOf = (look: Appearance) => appearanceSeed(look);
const portrait = { x: SKIN_PORTRAIT.x - 4, y: SKIN_PORTRAIT.y - 4, width: SKIN_PORTRAIT.width + 8, height: SKIN_PORTRAIT.height + 4 };
const whole = { x: 0, y: 0, width: SKIN_FRAME.width, height: SKIN_FRAME.height };

// One sheet per race and half of the classes: rows are the genders, columns the classes.
const variant = Number(process.argv[3] ?? 77);
for (const race of RACES) {
  for (const half of [0, 1]) {
    save(
      `race-${race}-${half + 1}.png`,
      grid(6, GENDERS.length, portrait, (column, row) => frame(skinFromSeed(seedOf({ race, class: CLASSES[half * 6 + column]!, gender: GENDERS[row]!, variant: variant + (half * 6 + column) * 31 + row * 7 })), 0), 6),
    );
  }
}

// All races in one sheet: a column per class, a row per race (males, then females).
for (const gender of GENDERS) {
  save(`all-${gender}.png`, grid(CLASSES.length, RACES.length, portrait, (column, row) => frame(skinFromSeed(seedOf({ race: RACES[row]!, class: CLASSES[column]!, gender, variant: variant + row * 13 + column })), 0)));
}

// Variants of a few looks: twelve each.
const looks: Appearance[] = [
  { race: 'human', class: 'fighter', gender: 'male', variant: 0 },
  { race: 'elf', class: 'wizard', gender: 'female', variant: 0 },
  { race: 'dwarf', class: 'cleric', gender: 'male', variant: 0 },
  { race: 'half-orc', class: 'barbarian', gender: 'undetermined', variant: 0 },
  { race: 'halfling', class: 'rogue', gender: 'female', variant: 0 },
  { race: 'gnome', class: 'druid', gender: 'male', variant: 0 },
];
save('variants.png', grid(12, looks.length, portrait, (column, row) => frame(skinFromSeed(seedOf({ ...looks[row]!, variant: column * 104729 + 5 })), 0)));

// The four views of one look per class.
save(
  'views.png',
  grid(SKIN_VIEWS.length, CLASSES.length, portrait, (column, row) => frame(skinFromSeed(seedOf({ race: RACES[row % RACES.length]!, class: CLASSES[row]!, gender: GENDERS[row % 3]!, variant: 4242 + row })), SKIN_VIEWS[column]!.yaw)),
);

// The attack frames of one look per class, facing right (whole frames: a weapon can reach far).
save(
  'attacks.png',
  grid(SKIN_ATTACK_FRAMES * 2, CLASSES.length, whole, (column, row) => {
    const skin = skinFromSeed(seedOf({ race: RACES[(row * 3) % RACES.length]!, class: CLASSES[row]!, gender: GENDERS[row % 3]!, variant: 999 + row }));
    return frame(skin, column < SKIN_ATTACK_FRAMES ? Math.PI / 2 : 0, column % SKIN_ATTACK_FRAMES);
  }),
);

for (const look of looks) console.log(describeSkin(skinFromSeed(seedOf({ ...look, variant: 5 }))));
console.log(`sheets in ${out}`);
