import { Rectangle, Texture } from 'pixi.js';
import type { Facing } from '@game/engine';
import type { AttackStyle } from '../../art/attacks.ts';
import { SKIN_ATTACK_FRAMES, SKIN_FRAME, SKIN_ROLL_FRAMES, SKIN_VERSION, SKIN_VIEWS, SKIN_WALK_FRAMES, renderSkinSheet, skinAttack, skinFromSeed } from '../../art/skins.ts';
import { ATTACK_TINT, type PlayerTextures } from '../render/player-view.ts';
import type { SkinRequest, SkinResult } from './skin-worker.ts';

/** How the skin of `seed` attacks, and the colour of its effect (a spell takes the colour of the orb). */
export function attackLook(seed: number): { style: AttackStyle; tint: number } {
  const skin = skinFromSeed(seed);
  const style = skinAttack(skin);
  const glass = skin.palette.glass;
  return { style, tint: style === 'spell' && glass ? glass[glass.length - 1]! >>> 8 : ATTACK_TINT[style] };
}

/** Rendered skins in localStorage: the visitor's own and the last ones met. */
const CACHE_PREFIX = `game.skins.v${SKIN_VERSION}.`;
const CACHE_INDEX = `${CACHE_PREFIX}index`;
const CACHE_SIZE = 24;
/** Skins kept as textures; beyond this, the ones that nobody wears now are freed (retain()). */
const MAX_READY = 40;

interface Cached {
  readonly png: string;
  readonly headHeight: number;
}

function readIndex(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(CACHE_INDEX) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

/**
 * The player skins of this page, as textures. A skin that is not in memory comes from the
 * localStorage cache, or else a worker renders it (skin-worker.ts). Rendering is one skin at a
 * time; `get(seed, then, true)` puts a skin at the front (the visitor's own).
 */
export class SkinStore {
  private readonly ready = new Map<number, PlayerTextures>();
  /** The sheet of each ready skin, for a preview in the GUI, and its base texture, to free it. */
  private readonly sheets = new Map<number, { canvas: HTMLCanvasElement; base: Texture }>();
  private readonly waiting = new Map<number, ((textures: PlayerTextures) => void)[]>();
  private readonly queue: number[] = [];
  private readonly started = new Set<number>();
  private worker: Worker | null = null;
  private busy = false;

  constructor() {
    try {
      this.worker = new Worker(new URL('./skin-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<SkinResult>) => {
        const { seed, width, height, pixels, headHeight } = event.data;
        this.busy = false;
        this.finish(seed, new Uint8ClampedArray(pixels), width, height, headHeight, true);
        this.next();
      };
      this.worker.onerror = () => {
        // No worker after all (an old browser, a blocked script): render on this thread.
        this.worker = null;
        this.busy = false;
        this.next();
      };
    } catch {
      this.worker = null;
    }
  }

  /**
   * The textures of a skin if they are ready. If not, returns null and calls `then` when they
   * are. `first` puts the skin at the front of the queue.
   */
  get(seed: number, then?: (textures: PlayerTextures) => void, first = false): PlayerTextures | null {
    const done = this.ready.get(seed);
    if (done) return done;
    if (then) this.waiting.set(seed, [...(this.waiting.get(seed) ?? []), then]);
    if (!this.started.has(seed)) {
      this.started.add(seed);
      void this.fromCache(seed).then((found) => {
        if (found) return;
        if (first) this.queue.unshift(seed);
        else this.queue.push(seed);
        this.next();
      });
    } else if (first && this.queue.includes(seed)) {
      this.queue.splice(this.queue.indexOf(seed), 1);
      this.queue.unshift(seed);
    }
    return null;
  }

  /**
   * Forgets a skin that is still in the queue (not drawn yet) and the calls that wait for it: the
   * character builder asks for many looks, and only the last one counts.
   */
  cancel(seed: number): void {
    const at = this.queue.indexOf(seed);
    if (at < 0) return;
    this.queue.splice(at, 1);
    this.started.delete(seed);
    this.waiting.delete(seed);
  }

  private next(): void {
    if (this.busy) return;
    const seed = this.queue.shift();
    if (seed === undefined) return;
    if (this.worker) {
      this.busy = true;
      this.worker.postMessage({ seed } satisfies SkinRequest);
      return;
    }
    // Without a worker: one skin per task, so the page stays responsive between skins.
    this.busy = true;
    setTimeout(() => {
      const sheet = renderSkinSheet(skinFromSeed(seed));
      this.busy = false;
      this.finish(seed, new Uint8ClampedArray(sheet.image.data.buffer as ArrayBuffer), sheet.image.width, sheet.image.height, sheet.headHeight, true);
      this.next();
    }, 0);
  }

  private async fromCache(seed: number): Promise<boolean> {
    let cached: Cached | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + seed) ?? 'null') as Cached | null;
    } catch {
      return false;
    }
    if (!cached || typeof cached.png !== 'string' || typeof cached.headHeight !== 'number') return false;
    try {
      const image = new Image();
      image.src = cached.png;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      this.done(seed, this.textures(seed, canvas, cached.headHeight));
      this.remember(seed, null);
      return true;
    } catch {
      return false;
    }
  }

  private finish(seed: number, pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, headHeight: number, save: boolean): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.putImageData(new ImageData(pixels, width, height), 0, 0);
    this.done(seed, this.textures(seed, canvas, headHeight));
    if (save) this.remember(seed, { png: canvas.toDataURL('image/png'), headHeight });
  }

  private done(seed: number, textures: PlayerTextures): void {
    this.ready.set(seed, textures);
    for (const then of this.waiting.get(seed) ?? []) then(textures);
    this.waiting.delete(seed);
  }

  /** Puts a skin at the front of the cache (and stores it, if `entry` is given); drops the oldest. */
  private remember(seed: number, entry: Cached | null): void {
    try {
      const index = readIndex().filter((s) => s !== seed);
      index.unshift(seed);
      if (entry) localStorage.setItem(CACHE_PREFIX + seed, JSON.stringify(entry));
      for (const old of index.splice(CACHE_SIZE)) localStorage.removeItem(CACHE_PREFIX + old);
      localStorage.setItem(CACHE_INDEX, JSON.stringify(index));
    } catch {
      // A full or blocked storage: the skin works, it is only made again next time.
    }
  }

  /** The sheet of a ready skin (all its frames, SKIN_FRAME each), or null. */
  sheet(seed: number): HTMLCanvasElement | null {
    return this.sheets.get(seed)?.canvas ?? null;
  }

  /**
   * Frees the textures of skins that nobody in `wearing` wears, oldest first, while more than
   * MAX_READY are kept. Players who change skins often would otherwise fill the memory.
   */
  retain(wearing: ReadonlySet<number>): void {
    if (this.ready.size <= MAX_READY) return;
    for (const [seed, textures] of this.ready) {
      if (this.ready.size <= MAX_READY) break;
      if (wearing.has(seed)) continue;
      for (const facing of Object.keys(textures.stand) as Facing[]) {
        textures.stand[facing].destroy(false);
        for (const frame of [...textures.walk[facing], ...textures.attack[facing], ...textures.roll[facing]]) frame.destroy(false);
      }
      this.sheets.get(seed)?.base.destroy(true);
      this.sheets.delete(seed);
      this.ready.delete(seed);
      this.started.delete(seed);
    }
  }

  /** The frames of a sheet: one row per view, the stand, the walk, the attack and the roll. */
  private textures(seed: number, canvas: HTMLCanvasElement, headHeight: number): PlayerTextures {
    const base = Texture.from(canvas);
    base.source.scaleMode = 'nearest';
    this.sheets.set(seed, { canvas, base });
    const { width, height, pivotX, pivotY } = SKIN_FRAME;
    const anchor = { x: pivotX / width, y: pivotY / height };
    const frame = (column: number, row: number) =>
      new Texture({ source: base.source, frame: new Rectangle(column * width, row * height, width, height), defaultAnchor: anchor });
    const stand = {} as Record<Facing, Texture>;
    const walk = {} as Record<Facing, Texture[]>;
    const attack = {} as Record<Facing, Texture[]>;
    const roll = {} as Record<Facing, Texture[]>;
    SKIN_VIEWS.forEach((view, row) => {
      stand[view.name] = frame(0, row);
      walk[view.name] = Array.from({ length: SKIN_WALK_FRAMES }, (_, i) => frame(1 + i, row));
      attack[view.name] = Array.from({ length: SKIN_ATTACK_FRAMES }, (_, i) => frame(1 + SKIN_WALK_FRAMES + i, row));
      roll[view.name] = Array.from({ length: SKIN_ROLL_FRAMES }, (_, i) => frame(1 + SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES + i, row));
    });
    return { stand, walk, attack, roll, headHeight };
  }
}
