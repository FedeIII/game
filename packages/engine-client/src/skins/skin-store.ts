import { Rectangle, Texture } from 'pixi.js';
import type { Facing } from '@game/engine';
import type { AttackStyle } from '../../art/attacks.ts';
import {
  SKIN_ATTACK_FRAMES,
  SKIN_COLUMNS,
  SKIN_EVADE_FRAMES,
  SKIN_HEAVY_ROLL_FRAMES,
  SKIN_FALL_FRAMES,
  SKIN_FRAME,
  SKIN_ROLL_FRAMES,
  SKIN_SNEAK_FRAMES,
  SKIN_VERSION,
  SKIN_VIEWS,
  SKIN_WALK_FRAMES,
  renderSkinSheet,
  skinAttack,
  skinKey,
  skinOfLook,
  type SkinLook,
} from '../../art/skins.ts';
import { ATTACK_TINT, type PlayerTextures } from '../render/player-view.ts';
import type { SkinRequest, SkinResult } from './skin-worker.ts';

/** How a look attacks, and the colour of its effect (a spell takes the colour of the orb). */
export function attackLook(look: SkinLook): { style: AttackStyle; tint: number } {
  const skin = skinOfLook(look);
  const style = skinAttack(skin);
  const glass = skin.palette.glass;
  return { style, tint: style === 'spell' && glass ? glass[glass.length - 1]! >>> 8 : ATTACK_TINT[style] };
}

/** Rendered skins in localStorage: the visitor's own and the last ones met. */
const CACHE_ROOT = 'game.skins.v';
const CACHE_PREFIX = `${CACHE_ROOT}${SKIN_VERSION}.`;
const CACHE_INDEX = `${CACHE_PREFIX}index`;
const CACHE_SIZE = 24;
/** Skins kept as textures; beyond this, the ones that nobody wears now are freed (retain()). */
const MAX_READY = 40;

interface Cached {
  readonly png: string;
  readonly headHeight: number;
}

/** Removes the skins that an older SKIN_VERSION kept: the page cannot use them, and they fill the storage. */
function dropOldSkins(): void {
  try {
    const old: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_ROOT) && !key.startsWith(CACHE_PREFIX)) old.push(key);
    }
    for (const key of old) localStorage.removeItem(key);
  } catch {
    // A blocked storage: nothing to remove.
  }
}

function readIndex(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(CACHE_INDEX) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * The player skins of this page, as textures. A skin is a look (SkinLook: a seed, and what shows
 * of the gear), known by its key (skinKey). A skin that is not in memory comes from the
 * localStorage cache, or else a worker renders it (skin-worker.ts). Rendering is one skin at a
 * time; `get(look, then, true)` puts a skin at the front (the visitor's own).
 */
export class SkinStore {
  private readonly ready = new Map<string, PlayerTextures>();
  /** The sheet of each ready skin, for a preview in the GUI, and its base texture, to free it. */
  private readonly sheets = new Map<string, { canvas: HTMLCanvasElement; base: Texture }>();
  private readonly waiting = new Map<string, ((textures: PlayerTextures) => void)[]>();
  /** The looks to render, by key. */
  private readonly looks = new Map<string, SkinLook>();
  private readonly queue: string[] = [];
  private readonly started = new Set<string>();
  private worker: Worker | null = null;
  private busy = false;

  constructor() {
    dropOldSkins();
    try {
      this.worker = new Worker(new URL('./skin-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<SkinResult>) => {
        const { key, width, height, pixels, headHeight } = event.data;
        this.busy = false;
        this.finish(key, new Uint8ClampedArray(pixels), width, height, headHeight, true);
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
  get(look: SkinLook, then?: (textures: PlayerTextures) => void, first = false): PlayerTextures | null {
    const key = skinKey(look);
    const done = this.ready.get(key);
    if (done) return done;
    if (then) this.waiting.set(key, [...(this.waiting.get(key) ?? []), then]);
    if (!this.started.has(key)) {
      this.started.add(key);
      this.looks.set(key, look);
      void this.fromCache(key).then((found) => {
        if (found) return;
        if (first) this.queue.unshift(key);
        else this.queue.push(key);
        this.next();
      });
    } else if (first && this.queue.includes(key)) {
      this.queue.splice(this.queue.indexOf(key), 1);
      this.queue.unshift(key);
    }
    return null;
  }

  /**
   * Forgets a skin that is still in the queue (not drawn yet) and the calls that wait for it: the
   * character builder asks for many looks, and only the last one counts.
   */
  cancel(look: SkinLook): void {
    const key = skinKey(look);
    const at = this.queue.indexOf(key);
    if (at < 0) return;
    this.queue.splice(at, 1);
    this.started.delete(key);
    this.waiting.delete(key);
    this.looks.delete(key);
  }

  private next(): void {
    if (this.busy) return;
    const key = this.queue.shift();
    if (key === undefined) return;
    const look = this.looks.get(key);
    if (!look) return this.next();
    if (this.worker) {
      this.busy = true;
      this.worker.postMessage({ look } satisfies SkinRequest);
      return;
    }
    // Without a worker: one skin per task, so the page stays responsive between skins.
    this.busy = true;
    setTimeout(() => {
      const sheet = renderSkinSheet(skinOfLook(look));
      this.busy = false;
      this.finish(key, new Uint8ClampedArray(sheet.image.data.buffer as ArrayBuffer), sheet.image.width, sheet.image.height, sheet.headHeight, true);
      this.next();
    }, 0);
  }

  private async fromCache(key: string): Promise<boolean> {
    let cached: Cached | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + key) ?? 'null') as Cached | null;
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
      this.done(key, this.textures(key, canvas, cached.headHeight));
      this.remember(key, null);
      return true;
    } catch {
      return false;
    }
  }

  private finish(key: string, pixels: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, headHeight: number, save: boolean): void {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.putImageData(new ImageData(pixels, width, height), 0, 0);
    this.done(key, this.textures(key, canvas, headHeight));
    if (save) this.remember(key, { png: canvas.toDataURL('image/png'), headHeight });
  }

  private done(key: string, textures: PlayerTextures): void {
    this.ready.set(key, textures);
    this.looks.delete(key);
    for (const then of this.waiting.get(key) ?? []) then(textures);
    this.waiting.delete(key);
  }

  /** Puts a skin at the front of the cache (and stores it, if `entry` is given); drops the oldest. */
  private remember(key: string, entry: Cached | null): void {
    try {
      const index = readIndex().filter((s) => s !== key);
      index.unshift(key);
      if (entry) localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
      for (const old of index.splice(CACHE_SIZE)) localStorage.removeItem(CACHE_PREFIX + old);
      localStorage.setItem(CACHE_INDEX, JSON.stringify(index));
    } catch {
      // A full or blocked storage: the skin works, it is only made again next time.
    }
  }

  /** The sheet of a ready skin (all its frames, SKIN_FRAME each), or null. */
  sheet(look: SkinLook): HTMLCanvasElement | null {
    return this.sheets.get(skinKey(look))?.canvas ?? null;
  }

  /**
   * Frees the textures of skins that nobody in `wearing` wears, oldest first, while more than
   * MAX_READY are kept. Players who change skins often would otherwise fill the memory.
   */
  retain(wearing: ReadonlySet<string>): void {
    if (this.ready.size <= MAX_READY) return;
    for (const [key, textures] of this.ready) {
      if (this.ready.size <= MAX_READY) break;
      if (wearing.has(key)) continue;
      for (const facing of Object.keys(textures.stand) as Facing[]) {
        textures.stand[facing].destroy(false);
        textures.crouch[facing].destroy(false);
        for (const frame of [...textures.walk[facing], ...textures.attack[facing], ...textures.roll[facing], ...textures.heavyRoll[facing], ...textures.fall[facing], ...textures.sneak[facing]]) frame.destroy(false);
      }
      this.sheets.get(key)?.base.destroy(true);
      this.sheets.delete(key);
      this.ready.delete(key);
      this.started.delete(key);
    }
  }

  /** The frames of a sheet: one row per view, the stand, the walk, the attack, the roll, the fall, the crouch, the sneak walk, the brace, the evade and the heavy roll. */
  private textures(key: string, canvas: HTMLCanvasElement, headHeight: number): PlayerTextures {
    const base = Texture.from(canvas);
    base.source.scaleMode = 'nearest';
    this.sheets.set(key, { canvas, base });
    const { width, height, pivotX, pivotY } = SKIN_FRAME;
    const anchor = { x: pivotX / width, y: pivotY / height };
    const frame = (column: number, row: number) =>
      new Texture({ source: base.source, frame: new Rectangle(column * width, row * height, width, height), defaultAnchor: anchor });
    const stand = {} as Record<Facing, Texture>;
    const walk = {} as Record<Facing, Texture[]>;
    const attack = {} as Record<Facing, Texture[]>;
    const roll = {} as Record<Facing, Texture[]>;
    const heavyRoll = {} as Record<Facing, Texture[]>;
    const fall = {} as Record<Facing, Texture[]>;
    const crouch = {} as Record<Facing, Texture>;
    const sneak = {} as Record<Facing, Texture[]>;
    const brace = {} as Record<Facing, Texture>;
    const evade = {} as Record<Facing, Texture[]>;
    const frames = (first: number, length: number, row: number) => Array.from({ length }, (_, i) => frame(first + i, row));
    SKIN_VIEWS.forEach((view, row) => {
      stand[view.name] = frame(SKIN_COLUMNS.stand, row);
      walk[view.name] = frames(SKIN_COLUMNS.walk, SKIN_WALK_FRAMES, row);
      attack[view.name] = frames(SKIN_COLUMNS.attack, SKIN_ATTACK_FRAMES, row);
      roll[view.name] = frames(SKIN_COLUMNS.roll, SKIN_ROLL_FRAMES, row);
      heavyRoll[view.name] = frames(SKIN_COLUMNS.heavyRoll, SKIN_HEAVY_ROLL_FRAMES, row);
      fall[view.name] = frames(SKIN_COLUMNS.fall, SKIN_FALL_FRAMES, row);
      crouch[view.name] = frame(SKIN_COLUMNS.crouch, row);
      sneak[view.name] = frames(SKIN_COLUMNS.sneak, SKIN_SNEAK_FRAMES, row);
      brace[view.name] = frame(SKIN_COLUMNS.brace, row);
      evade[view.name] = frames(SKIN_COLUMNS.evade, SKIN_EVADE_FRAMES, row);
    });
    return { stand, walk, attack, roll, heavyRoll, fall, crouch, sneak, brace, evade, headHeight };
  }
}
