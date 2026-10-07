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
import { buildArt } from './sprites.ts';

const ATLAS_WIDTH = 256;
/** Transparent space between frames, so a frame never samples its neighbour. */
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

const atlas = new Image(ATLAS_WIDTH, atlasHeight);
const frames: Record<string, unknown> = {};
for (const frame of art.frames) {
  const at = placed.get(frame.name)!;
  atlas.draw(frame.image, at.x, at.y);
  const w = frame.image.width;
  const h = frame.image.height;
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
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'atlas.png'), encodePng(atlas));
writeFileSync(join(outDir, 'atlas.json'), JSON.stringify(json, null, 1) + '\n');
// The page icon: the player, front view, at 2x.
const iconFrame = art.frames.find((frame) => frame.name === 'player/down/0');
if (!iconFrame) throw new Error('no player/down/0 frame for the icon');
writeFileSync(join(outDir, 'icon.png'), encodePng(upscale(iconFrame.image, 2)));
console.log(`art: ${art.frames.length} frames -> src/generated/atlas.png (${ATLAS_WIDTH}x${atlasHeight})`);

const previewAt = process.argv.indexOf('--preview');
if (previewAt !== -1) {
  const path = process.argv[previewAt + 1];
  if (!path) throw new Error('--preview needs an output path');
  // A grey background shows transparent pixels.
  const backed = new Image(atlas.width, atlas.height);
  for (let py = 0; py < atlas.height; py++) {
    for (let px = 0; px < atlas.width; px++) backed.set(px, py, (px >> 3) % 2 === (py >> 3) % 2 ? 0x2a2a33ff : 0x33333dff);
  }
  backed.draw(atlas, 0, 0);
  writeFileSync(path, encodePng(upscale(backed, 4)));
  console.log(`art: preview -> ${path}`);
}
