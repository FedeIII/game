import { CHUNK_SIZE, Decor, Ground, Structure, TILE_SIZE, type World } from '@game/engine';
import { isFormField } from '../input/keyboard.ts';
import { MAP_HOUSES, MAP_NAMES, MAP_SECRETS } from './gates.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';

const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6"/><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2"/><path d="M9 9l2 2 4-4M9 15h6"/></svg>`;

/** The map shows this many tiles across (one canvas pixel each), round the player. */
const SPAN = 256;
/** At most this many new chunks are drawn in one redraw; the rest come in the next ones. */
const CHUNK_BUDGET = 12;
/** While the panel is open, it draws again this often (ms). */
const REDRAW_MS = 400;

/** The colours of the ground on the map: dark, as the art. */
const GROUND_COLOUR: Readonly<Record<number, readonly [number, number, number]>> = {
  [Ground.Water]: [22, 38, 46],
  [Ground.Shallows]: [40, 58, 56],
  [Ground.Sand]: [74, 68, 56],
  [Ground.Dirt]: [80, 64, 46],
  [Ground.Grass]: [44, 52, 32],
  [Ground.DarkGrass]: [33, 43, 28],
  [Ground.Floor]: [92, 74, 54],
  [Ground.Cobble]: [74, 70, 64],
  [Ground.FloorStone]: [84, 80, 74],
  [Ground.FloorEarth]: [86, 70, 50],
};
const TREE: readonly [number, number, number] = [22, 32, 20];
const ROCK: readonly [number, number, number] = [86, 86, 82];
const WALL: readonly [number, number, number] = [150, 134, 112];

/**
 * The map (Intelligence): a button in the top-right corner (left of the pack) and M open a panel
 * with the land that the character has seen, round the player, one pixel for each tile. Everyone
 * sees the ground and the home; with INT 11 the houses and the paths; with INT 13 the names of
 * places and the refuges; with INT 15 the barred houses and the locked chests (Fede's choice,
 * 2026-10-10). The page draws each seen chunk from the world's own generator.
 */
export class MapPanel {
  private readonly world: World;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly labels: HTMLElement;
  private readonly int: number;
  private readonly chunks = new Map<string, ImageData>();
  private drawnAt = -Infinity;

  /** `int`: the Intelligence of the character; `note`: a line under the map (a map that is not saved), or null. */
  constructor(world: World, int: number, note: string | null) {
    const text = STRINGS.map;
    this.world = world;
    this.int = int;
    this.button = document.createElement('button');
    this.button.id = 'map-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', text.button);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'map');
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'map';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', text.heading);
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = text.heading;
    const frame = document.createElement('div');
    frame.className = 'map-frame';
    this.canvas = document.createElement('canvas');
    this.canvas.width = SPAN;
    this.canvas.height = SPAN;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.labels = document.createElement('div');
    this.labels.className = 'map-labels';
    frame.append(this.canvas, this.labels);
    const hint = document.createElement('p');
    hint.className = 'menu-hint';
    hint.textContent = note ?? text.note;
    this.panel.append(title, frame, hint);

    this.button.addEventListener('click', () => this.open(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.open(false);
      if (event.code !== 'KeyM' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault();
      this.open(this.panel.hidden !== false);
    });
    onOtherPanelOpen('map', () => this.open(false));
    document.body.append(this.button, this.panel);
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  /** Draws the map round the player at (x, y) with the seen chunks ("cx,cy"), if it is open (now and then). */
  update(now: number, x: number, y: number, explored: ReadonlySet<string>): void {
    if (this.panel.hidden || now - this.drawnAt < REDRAW_MS) return;
    this.drawnAt = now;
    const context = this.canvas.getContext('2d');
    if (!context) return;
    const tx0 = Math.floor(x / TILE_SIZE) - SPAN / 2;
    const ty0 = Math.floor(y / TILE_SIZE) - SPAN / 2;
    context.fillStyle = '#060506';
    context.fillRect(0, 0, SPAN, SPAN);
    let budget = CHUNK_BUDGET;
    for (let cy = Math.floor(ty0 / CHUNK_SIZE); cy <= Math.floor((ty0 + SPAN) / CHUNK_SIZE); cy++) {
      for (let cx = Math.floor(tx0 / CHUNK_SIZE); cx <= Math.floor((tx0 + SPAN) / CHUNK_SIZE); cx++) {
        const key = `${cx},${cy}`;
        if (!explored.has(key)) continue;
        let image = this.chunks.get(key);
        if (!image) {
          if (budget-- <= 0) {
            // Not drawn yet: the next redraw comes sooner.
            this.drawnAt = now - REDRAW_MS + 50;
            continue;
          }
          image = this.chunkImage(context, cx, cy);
          this.chunks.set(key, image);
        }
        context.putImageData(image, cx * CHUNK_SIZE - tx0, cy * CHUNK_SIZE - ty0);
      }
    }
    const seen = (tx: number, ty: number) => explored.has(`${Math.floor(tx / CHUNK_SIZE)},${Math.floor(ty / CHUNK_SIZE)}`);
    if (this.int >= MAP_SECRETS) this.drawSecrets(context, tx0, ty0, seen);
    // The home, and the player.
    this.labels.replaceChildren();
    for (const mark of this.world.source.landmarks?.() ?? []) {
      const mx = Math.floor(mark.x / TILE_SIZE) - tx0;
      const my = Math.floor(mark.y / TILE_SIZE) - ty0;
      if (mx < 0 || my < 0 || mx >= SPAN || my >= SPAN || !seen(mark.x / TILE_SIZE, mark.y / TILE_SIZE)) continue;
      if (mark.kind !== 'home' && this.int < MAP_NAMES) continue;
      context.fillStyle = mark.kind === 'refuge' ? '#d8ccb0' : '#c9a64a';
      context.fillRect(mx - 1, my - 1, 3, 3);
      if (this.int >= MAP_NAMES || mark.kind === 'home') {
        const label = document.createElement('span');
        label.className = 'map-label';
        label.textContent = mark.name;
        label.style.left = `${(100 * mx) / SPAN}%`;
        label.style.top = `${(100 * my) / SPAN}%`;
        this.labels.append(label);
      }
    }
    context.fillStyle = '#e04a3a';
    context.fillRect(SPAN / 2 - 1, SPAN / 2 - 1, 3, 3);
  }

  /** One chunk as pixels: the ground, trees and rocks; with INT 11 also the paths and the walls. */
  private chunkImage(context: CanvasRenderingContext2D, cx: number, cy: number): ImageData {
    const chunk = this.world.source.chunk(cx, cy);
    const image = context.createImageData(CHUNK_SIZE, CHUNK_SIZE);
    const houses = this.int >= MAP_HOUSES;
    for (let i = 0; i < CHUNK_SIZE * CHUNK_SIZE; i++) {
      let ground = chunk.ground[i]! as Ground;
      const structure = chunk.structure[i]!;
      const decor = chunk.decor[i]! as Decor;
      // Without the detail of INT 11, a house and a path show as the grass round them.
      if (!houses && (ground === Ground.Dirt || ground === Ground.Floor || ground === Ground.FloorStone || ground === Ground.FloorEarth || ground === Ground.Cobble)) ground = Ground.Grass;
      let colour = GROUND_COLOUR[ground] ?? GROUND_COLOUR[Ground.Grass]!;
      if (decor === Decor.Tree) colour = TREE;
      else if (decor === Decor.Rock) colour = ROCK;
      if (houses && (structure === Structure.Wall || structure === Structure.Window || structure === Structure.Door)) colour = WALL;
      image.data.set([colour[0], colour[1], colour[2], 255], i * 4);
    }
    return image;
  }

  /** INT 15: a red cross on the door of a barred house, and a gold dot on a locked chest. */
  private drawSecrets(context: CanvasRenderingContext2D, tx0: number, ty0: number, seen: (tx: number, ty: number) => boolean): void {
    for (const building of this.world.source.buildingsIn(tx0, ty0, tx0 + SPAN, ty0 + SPAN)) {
      if (!building.barred || !seen(building.doorX, building.y1)) continue;
      const x = building.doorX - tx0;
      const y = building.y1 - ty0;
      context.fillStyle = '#d0302a';
      for (const [dx, dy] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]] as const) context.fillRect(x + dx, y + dy, 1, 1);
    }
    for (const fixture of this.world.source.fixturesIn(tx0, ty0, tx0 + SPAN, ty0 + SPAN)) {
      if (!fixture.lock || !seen(fixture.tx, fixture.ty)) continue;
      context.fillStyle = '#e0c060';
      context.fillRect(fixture.tx - tx0, fixture.ty - ty0, 1, 1);
    }
  }

  private open(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) {
      this.drawnAt = -Infinity;
      announceOpenPanel('map');
    }
  }
}
