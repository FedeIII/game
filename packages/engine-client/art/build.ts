/**
 * Packs the art into an atlas of one or more pages: src/generated/atlas.png, atlas-1.png, ... and
 * src/generated/atlas.json. The JSON is the PixiJS spritesheet format (the TexturePacker "hash"
 * format), with the page of each frame (`page`) and the list of pages (`meta.pages`). Aseprite can
 * export the same format, so real art can replace the generated art without a code change.
 *
 *   node art/build.ts                    # writes the atlas
 *   node art/build.ts --preview out.png  # also writes an 8x preview of the atlas
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Image, encodePng, upscale } from './png.ts';
import { FONT, SMALL_FONT } from './font.ts';
import { LIGHTING } from './lights.ts';
import { buildArt } from './sprites.ts';

/**
 * Each page of the atlas stays within MAX_ATLAS_SIZE on both sides: a GPU that samples with 16-bit
 * floats (mediump on many Android phones) is then never off by half a texel, so a frame never shows
 * a row or a column of its neighbour (black lines, broken text). When a page is full, the frames go
 * on to the next page (2026-10-12: the art outgrew one page). The renderer batches the pages of
 * one frame together, so more pages cost no draw calls.
 */
const MAX_ATLAS_SIZE = 2048;
/** ATLAS_PAGE=<px> builds smaller pages (a test of the pages); the width is the same. */
const PAGE = Number(process.env.ATLAS_PAGE ?? MAX_ATLAS_SIZE);
const ATLAS_WIDTH = PAGE;
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

// Shelf packing: the tallest frames first, left to right, then the next row; a row that does not
// fit on the page starts the next page.
const order = [...art.frames].sort((a, b) => b.image.height - a.image.height || a.name.localeCompare(b.name));
const placed = new Map<string, { page: number; x: number; y: number }>();
const heights: number[] = [];
let page = 0;
let x = PADDING;
let y = PADDING;
let rowHeight = 0;
for (const frame of order) {
  if (frame.image.width + 2 * PADDING > ATLAS_WIDTH || frame.image.height + 2 * PADDING > PAGE) throw new Error(`the frame ${frame.name} is larger than a page`);
  if (x + frame.image.width + PADDING > ATLAS_WIDTH) {
    x = PADDING;
    y += rowHeight + PADDING;
    rowHeight = 0;
  }
  if (y + frame.image.height + PADDING > PAGE) {
    heights[page] = y;
    page++;
    x = PADDING;
    y = PADDING;
    rowHeight = 0;
  }
  placed.set(frame.name, { page, x, y });
  x += frame.image.width + PADDING;
  rowHeight = Math.max(rowHeight, frame.image.height);
}
heights[page] = y + rowHeight + PADDING;

/** The file of each page: atlas.png, then atlas-1.png, atlas-2.png, ... */
const pageFile = (i: number) => (i === 0 ? 'atlas.png' : `atlas-${i}.png`);
const atlases = heights.map((h) => new Image(ATLAS_WIDTH, h));
const frames: Record<string, unknown> = {};
let atlas = atlases[0]!;
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
  atlas = atlases[at.page]!;
  atlas.draw(frame.image, at.x, at.y);
  const w = frame.image.width;
  const h = frame.image.height;
  extrude(at.x, at.y, w, h);
  frames[frame.name] = {
    page: at.page,
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
    pages: atlases.map((a, i) => ({ image: pageFile(i), size: { w: a.width, h: a.height } })),
    format: 'RGBA8888',
    size: { w: ATLAS_WIDTH, h: heights[0] },
    scale: 1,
    lighting: LIGHTING,
    font: FONT,
    smallFont: SMALL_FONT,
    mobEyes: art.mobEyes,
  },
};

mkdirSync(outDir, { recursive: true });
// The pages; and no page left over from a build with more of them.
for (const name of readdirSync(outDir)) if (/^atlas-\d+\.png$/.test(name)) rmSync(join(outDir, name));
atlases.forEach((a, i) => writeFileSync(join(outDir, pageFile(i)), encodePng(a)));
writeFileSync(join(outDir, 'atlas.json'), JSON.stringify(json, null, 1) + '\n');
// The page icon: the player, front view, at 2x.
const iconFrame = art.frames.find((frame) => frame.name === 'player/down/stand');
if (!iconFrame) throw new Error('no player/down/stand frame for the icon');
writeFileSync(join(outDir, 'icon.png'), encodePng(upscale(iconFrame.image, 2)));
console.log(`art: ${art.frames.length} frames -> ${atlases.map((a, i) => `src/generated/${pageFile(i)} (${a.width}x${a.height})`).join(', ')}`);

const previewAt = process.argv.indexOf('--preview');
if (previewAt !== -1) {
  const path = process.argv[previewAt + 1];
  if (!path) throw new Error('--preview needs an output path');
  // The first page, on a dark chequer that shows transparent pixels.
  const first = atlases[0]!;
  const backed = new Image(first.width, first.height);
  for (let py = 0; py < first.height; py++) {
    for (let px = 0; px < first.width; px++) backed.set(px, py, (px >> 3) % 2 === (py >> 3) % 2 ? 0x2a2a33ff : 0x33333dff);
  }
  backed.draw(first, 0, 0);
  writeFileSync(path, encodePng(upscale(backed, 4)));
  console.log(`art: preview -> ${path}`);
}
