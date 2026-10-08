/**
 * Packs the art into one atlas: src/generated/atlas.png and src/generated/atlas.json.
 * The JSON is the PixiJS spritesheet format (the TexturePacker "hash" format). Aseprite can
 * export the same format, so real art can replace the generated art without a code change.
 *
 *   node art/build.ts                    # writes the atlas
 *   node art/build.ts --preview out.png  # also writes an 8x preview of the atlas
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Image, encodePng, upscale } from './png.ts';
import { FONT, SMALL_FONT } from './font.ts';
import { LIGHTING } from './lights.ts';
import { buildArt } from './sprites.ts';

/**
 * The atlas is wide rather than tall, and it must stay within MAX_ATLAS_SIZE on both sides: a GPU
 * that samples with 16-bit floats (mediump on many Android phones) is then never off by half a
 * texel, so a frame never shows a row or a column of its neighbour (black lines, broken text).
 */
const ATLAS_WIDTH = 1024;
const MAX_ATLAS_SIZE = 2048;
/**
 * Space between frames, so a frame never samples its neighbour. Each frame repeats its edge
 * pixels 1 px out into it (extrusion): a sample a little off the frame (a GPU with low
 * precision) gets the frame's own edge, not an empty pixel that shows as a black line.
 */
const PADDING = 2;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'src', 'generated');

const art = buildArt();

const names = new Set<string>();
for (const frame of art.frames) {
  if (names.has(frame.name)) throw new Error(`duplicate frame name: ${frame.name}`);
  names.add(frame.name);
}
for (const [animation, frames] of Object.entries(art.animations)) {
  for (const name of frames) if (!names.has(name)) throw new Error(`animation ${animation} uses unknown frame ${name}`);
}

// Shelf packing: the tallest frames first, left to right, then the next row.
const order = [...art.frames].sort((a, b) => b.image.height - a.image.height || a.name.localeCompare(b.name));
const placed = new Map<string, { x: number; y: number }>();
let x = PADDING;
let y = PADDING;
let rowHeight = 0;
for (const frame of order) {
  if (x + frame.image.width + PADDING > ATLAS_WIDTH) {
    x = PADDING;
    y += rowHeight + PADDING;
    rowHeight = 0;
  }
  placed.set(frame.name, { x, y });
  x += frame.image.width + PADDING;
  rowHeight = Math.max(rowHeight, frame.image.height);
}
const atlasHeight = y + rowHeight + PADDING;
if (atlasHeight > MAX_ATLAS_SIZE) {
  throw new Error(`the atlas is ${ATLAS_WIDTH} x ${atlasHeight}: keep it within ${MAX_ATLAS_SIZE} px (16-bit GPUs), e.g. make ATLAS_WIDTH larger`);
}

const atlas = new Image(ATLAS_WIDTH, atlasHeight);
const frames: Record<string, unknown> = {};
/** Repeats the edge pixels of the frame at (x, y) one pixel out, into the padding round it. */
function extrude(x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j++) {
    atlas.set(x - 1, y + j, atlas.get(x, y + j));
    atlas.set(x + w, y + j, atlas.get(x + w - 1, y + j));
  }
  for (let i = -1; i <= w; i++) {
    atlas.set(x + i, y - 1, atlas.get(x + i, y));
    atlas.set(x + i, y + h, atlas.get(x + i, y + h - 1));
  }
}

for (const frame of art.frames) {
  const at = placed.get(frame.name)!;
  atlas.draw(frame.image, at.x, at.y);
  const w = frame.image.width;
  const h = frame.image.height;
  extrude(at.x, at.y, w, h);
  frames[frame.name] = {
    frame: { x: at.x, y: at.y, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
    ...(frame.anchor ? { anchor: frame.anchor } : {}),
  };
}

const json = {
  frames,
  animations: art.animations,
  meta: {
    app: 'packages/client/art/build.ts',
    image: 'atlas.png',
    format: 'RGBA8888',
    size: { w: ATLAS_WIDTH, h: atlasHeight },
    scale: 1,
    lighting: LIGHTING,
    font: FONT,
    smallFont: SMALL_FONT,
    mobEyes: art.mobEyes,
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'atlas.png'), encodePng(atlas));
writeFileSync(join(outDir, 'atlas.json'), JSON.stringify(json, null, 1) + '\n');
// The page icon: the player, front view, at 2x.
const iconFrame = art.frames.find((frame) => frame.name === 'player/down/stand');
if (!iconFrame) throw new Error('no player/down/stand frame for the icon');
writeFileSync(join(outDir, 'icon.png'), encodePng(upscale(iconFrame.image, 2)));
console.log(`art: ${art.frames.length} frames -> src/generated/atlas.png (${ATLAS_WIDTH}x${atlasHeight})`);

const previewAt = process.argv.indexOf('--preview');
if (previewAt !== -1) {
  const path = process.argv[previewAt + 1];
  if (!path) throw new Error('--preview needs an output path');
  // A dark chequer shows transparent pixels.
  const backed = new Image(atlas.width, atlas.height);
  for (let py = 0; py < atlas.height; py++) {
    for (let px = 0; px < atlas.width; px++) backed.set(px, py, (px >> 3) % 2 === (py >> 3) % 2 ? 0x2a2a33ff : 0x33333dff);
  }
  backed.draw(atlas, 0, 0);
  writeFileSync(path, encodePng(upscale(backed, 4)));
  console.log(`art: preview -> ${path}`);
}
