import type { PrologueCard } from '@game/engine';
import prologueData from '../generated/prologue.json';
import { tw } from '../i18n.ts';
import { STRINGS } from './strings.ts';

/**
 * The prologue (Fede's request, 2026-10-12): the world's cards of text (WorldDefinition.prologue)
 * over painted scenes of Kandrax (art/prologue.ts, an atlas of its own that loads only now). Each
 * scene pans slowly, the near layers more than the far ones, and its emitters add what moves: stars
 * that twinkle, smoke, embers, fireflies, motes of light, birds, mist and a candle's flame. The lines
 * type themselves and go on by themselves; a click, a tap, Space, Enter or the right arrow finishes a
 * line or goes to the next one. "Skip" or Escape ends the prologue at once.
 */

interface LayerData {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly depth: number;
}

interface EmitterData {
  readonly kind: 'twinkle' | 'smoke' | 'embers' | 'fireflies' | 'motes' | 'sparkles' | 'flame' | 'birds' | 'mist';
  readonly layer: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rate: number;
  readonly colour: string;
}

interface SceneData {
  readonly id: string;
  readonly layers: readonly LayerData[];
  readonly emitters: readonly EmitterData[];
}

const DATA = prologueData as unknown as { readonly view: { readonly w: number; readonly h: number }; readonly scenes: readonly SceneData[] };
const SHEET_URL = Object.values(import.meta.glob('../generated/prologue.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)[0]!;

/** The pacing of the prologue (ms): fades, a title, typing, and the time to read a line. */
export const PROLOGUE_TIMING = {
  fade: 700,
  title: 2600,
  /** Characters typed each second. */
  typing: 45,
  /** A line stays this long after it is typed, and this much more for each character. */
  read: 1600,
  readPerChar: 34,
  /** How far the nearest layer pans over a scene (pixels of the art). */
  pan: 64,
} as const;

/** How long a line stays, typed and read (ms). */
export function lineMs(line: string): number {
  return (line.length / PROLOGUE_TIMING.typing) * 1000 + PROLOGUE_TIMING.read + line.length * PROLOGUE_TIMING.readPerChar;
}

/** How long a card lasts with nobody hurrying it (ms): its fades, its title and its lines. */
export function cardMs(card: Pick<PrologueCard, 'title' | 'lines'>): number {
  return 2 * PROLOGUE_TIMING.fade + (card.title ? PROLOGUE_TIMING.title : 0) + card.lines.reduce((sum, line) => sum + lineMs(line), 0);
}

/** A card's texts in the page's language, with {name} and {kind} filled in. */
export function cardTexts(card: PrologueCard, name: string, kind: string): { title: string | null; subtitle: string | null; lines: string[] } {
  const fill = (text: string) => tw(text).replaceAll('{name}', name).replaceAll('{kind}', kind);
  return { title: card.title ? fill(card.title) : null, subtitle: card.subtitle ? fill(card.subtitle) : null, lines: card.lines.map(fill) };
}

// ---------------------------------------------------------------- particles

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  /** Fireflies: on or off, and until when. */
  on?: boolean;
  until?: number;
}

const rgbOf = (hex: string) => [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)] as const;

/** What moves on a layer of a scene, from one emitter. */
class Emitter {
  readonly data: EmitterData;
  private readonly particles: Particle[] = [];
  private debt = 0;
  private readonly rgb: readonly [number, number, number];
  private flicker = 0;
  private flame = { h: 5, lean: 0 };

  constructor(data: EmitterData) {
    this.data = data;
    this.rgb = rgbOf(data.colour);
    // The steady ones start full: the stars twinkle and the fireflies glow at once.
    if (data.kind === 'twinkle' || data.kind === 'fireflies') for (let i = 0; i < data.rate; i++) this.particles.push(this.make(Math.random() * 2));
  }

  private make(age = 0): Particle {
    const d = this.data;
    const p: Particle = { x: d.x + Math.random() * d.w, y: d.y + Math.random() * d.h, vx: 0, vy: 0, age, life: 1 };
    switch (d.kind) {
      case 'twinkle':
        p.life = 0.8 + Math.random() * 2.2;
        break;
      case 'smoke':
        p.vx = 2 + Math.random() * 3;
        p.vy = -(5 + Math.random() * 5);
        p.life = 4 + Math.random() * 3;
        break;
      case 'embers':
        p.vx = (Math.random() - 0.5) * 6;
        p.vy = -(12 + Math.random() * 14);
        p.life = 1 + Math.random() * 1.6;
        break;
      case 'fireflies':
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = (Math.random() - 0.5) * 6;
        p.life = Infinity;
        p.on = Math.random() < 0.5;
        p.until = Math.random() * 2;
        break;
      case 'motes':
        p.vx = (Math.random() - 0.5) * 3;
        p.vy = -(1.5 + Math.random() * 3);
        p.life = 3 + Math.random() * 3;
        break;
      case 'sparkles':
        p.life = 0.5 + Math.random() * 0.8;
        break;
      case 'birds':
        p.x = d.x - 6;
        p.vx = 16 + Math.random() * 12;
        p.vy = (Math.random() - 0.5) * 2;
        p.life = (d.w + 20) / p.vx;
        break;
      case 'mist':
        p.x = d.x - 50 + Math.random() * (d.w + 50);
        p.vx = 2 + Math.random() * 3;
        p.life = 8 + Math.random() * 5;
        break;
      default:
        break;
    }
    return p;
  }

  step(dt: number): void {
    const d = this.data;
    if (d.kind === 'flame') {
      this.flicker -= dt;
      if (this.flicker <= 0) {
        this.flicker = 0.06 + Math.random() * 0.08;
        this.flame = { h: 4 + Math.floor(Math.random() * 3), lean: Math.floor(Math.random() * 3) - 1 };
      }
      return;
    }
    if (d.kind !== 'twinkle' && d.kind !== 'fireflies') {
      this.debt += d.rate * dt;
      while (this.debt >= 1) {
        this.debt--;
        this.particles.push(this.make());
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.age += dt;
      if (d.kind === 'fireflies') {
        p.vx += (Math.random() - 0.5) * 20 * dt;
        p.vy += (Math.random() - 0.5) * 16 * dt;
        p.vx = Math.max(-8, Math.min(8, p.vx));
        p.vy = Math.max(-5, Math.min(5, p.vy));
        if (p.x < d.x || p.x > d.x + d.w) p.vx = -p.vx;
        if (p.y < d.y || p.y > d.y + d.h) p.vy = -p.vy;
        if (p.age > p.until!) {
          p.on = !p.on;
          p.until = p.age + (p.on ? 0.8 + Math.random() * 1.6 : 0.4 + Math.random() * 2);
        }
      }
      if (d.kind === 'embers') p.vx += Math.sin(p.age * 9 + i) * 10 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) {
        if (d.kind === 'twinkle') this.particles[i] = this.make();
        else this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, offset: number): void {
    const d = this.data;
    const [r, g, b] = this.rgb;
    const dot = (x: number, y: number, a: number, size = 1) => {
      if (a <= 0) return;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a)})`;
      ctx.fillRect(Math.round(x - offset), Math.round(y), size, size);
    };
    if (d.kind === 'flame') {
      const x = Math.round(d.x + d.w / 2 - offset);
      const base = d.y + d.h;
      const glow = ctx.createRadialGradient(x + 0.5, base - 3, 0, x + 0.5, base - 3, 18);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - 18, base - 21, 37, 37);
      for (let k = 0; k < this.flame.h; k++) {
        const t = k / this.flame.h;
        const w = t < 0.6 ? 3 : 1;
        ctx.fillStyle = t < 0.35 ? '#ff9a30' : t < 0.7 ? '#ffd070' : '#fff4c0';
        ctx.fillRect(x - Math.floor(w / 2) + (t > 0.6 ? this.flame.lean : 0), base - k, w, 1);
      }
      return;
    }
    for (const p of this.particles) {
      const t = p.life === Infinity ? 0 : p.age / p.life;
      switch (d.kind) {
        case 'twinkle': {
          const a = Math.sin(Math.PI * t);
          dot(p.x, p.y, a);
          if (a > 0.75) {
            dot(p.x - 1, p.y, (a - 0.75) * 2);
            dot(p.x + 1, p.y, (a - 0.75) * 2);
            dot(p.x, p.y - 1, (a - 0.75) * 2);
            dot(p.x, p.y + 1, (a - 0.75) * 2);
          }
          break;
        }
        case 'sparkles': {
          const a = Math.sin(Math.PI * t);
          dot(p.x, p.y, a);
          dot(p.x - 1, p.y, a * 0.5);
          dot(p.x + 1, p.y, a * 0.5);
          dot(p.x, p.y - 1, a * 0.5);
          dot(p.x, p.y + 1, a * 0.5);
          break;
        }
        case 'smoke': {
          const size = 1 + Math.floor(t * 4);
          dot(p.x - size / 2, p.y - size / 2, 0.45 * (1 - t), size);
          break;
        }
        case 'embers':
          dot(p.x, p.y, (1 - t) * (0.6 + Math.random() * 0.4));
          break;
        case 'fireflies':
          if (p.on) {
            dot(p.x - 1, p.y - 1, 0.18, 3);
            dot(p.x, p.y, 0.95);
          }
          break;
        case 'motes':
          dot(p.x, p.y, Math.sin(Math.PI * t) * 0.8);
          break;
        case 'birds': {
          const up = Math.floor(p.age * 5) % 2 === 0;
          dot(p.x, p.y, 0.9);
          dot(p.x - 1, p.y + (up ? -1 : 0), 0.9);
          dot(p.x + 1, p.y + (up ? -1 : 0), 0.9);
          break;
        }
        case 'mist': {
          ctx.fillStyle = `rgba(${r},${g},${b},${0.12 * Math.sin(Math.PI * t)})`;
          ctx.beginPath();
          ctx.ellipse(p.x - offset, p.y, 28, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default:
          break;
      }
    }
  }
}

// ---------------------------------------------------------------- the player

export interface PrologueOptions {
  readonly cards: readonly PrologueCard[];
  /** What {name} and {kind} stand for in the texts: the character's name, and its race and class. */
  readonly name: string;
  readonly kind: string;
}

/** Loads the sheet of the scenes. */
function loadSheet(): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = SHEET_URL;
  return image.decode().then(() => image);
}

/** Whether a prologue plays now (the game keeps its input out). */
let playing = false;
export function prologuePlaying(): boolean {
  return playing;
}

/**
 * Plays the prologue over the page. It resolves when the last card ends, or when the player skips
 * it. Without a card, or when its art does not load, it resolves at once.
 */
export async function playPrologue(options: PrologueOptions): Promise<void> {
  if (options.cards.length === 0 || playing) return;
  const T = STRINGS.prologue;
  const root = document.createElement('div');
  root.id = 'prologue';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', T.label);
  const stage = document.createElement('div');
  stage.className = 'prologue-stage';
  const canvas = document.createElement('canvas');
  canvas.width = DATA.view.w;
  canvas.height = DATA.view.h;
  canvas.className = 'prologue-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const titleBox = document.createElement('div');
  titleBox.className = 'prologue-title';
  const title = document.createElement('h1');
  const subtitle = document.createElement('p');
  titleBox.append(title, subtitle);
  stage.append(canvas, titleBox);
  const text = document.createElement('p');
  text.className = 'prologue-text';
  text.setAttribute('aria-hidden', 'true');
  const spoken = document.createElement('p');
  spoken.className = 'sr-only';
  spoken.setAttribute('aria-live', 'polite');
  const more = document.createElement('span');
  more.className = 'prologue-more';
  more.setAttribute('aria-hidden', 'true');
  more.textContent = '▸';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'prologue-skip';
  skip.textContent = T.skip;
  root.append(stage, text, more, spoken, skip);
  document.body.append(root);
  playing = true;
  const before = document.activeElement;
  skip.focus();

  // The size: as big as fits over the text, in whole steps of pixels when it is large.
  const fit = () => {
    const room = Math.max(120, window.innerHeight - 150);
    let scale = Math.min(window.innerWidth / DATA.view.w, room / DATA.view.h);
    if (scale >= 2) scale = Math.floor(scale);
    canvas.style.width = `${Math.round(DATA.view.w * scale)}px`;
    canvas.style.height = `${Math.round(DATA.view.h * scale)}px`;
    text.style.maxWidth = `${Math.max(280, Math.round(DATA.view.w * scale))}px`;
  };
  fit();
  window.addEventListener('resize', fit);

  let sheet: HTMLImageElement;
  try {
    sheet = await loadSheet();
  } catch {
    // No art (offline, a failed request): no prologue; the game goes on.
    window.removeEventListener('resize', fit);
    root.remove();
    playing = false;
    return;
  }

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const scenes = new Map(DATA.scenes.map((s) => [s.id, s]));

  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  let ending = false;
  let cardIndex = -1;
  let cardStart = 0;
  let cardLength = 0;
  let scene: SceneData | undefined;
  let emitters: Emitter[] = [];
  let texts = { title: null as string | null, subtitle: null as string | null, lines: [] as string[] };
  // The time line of the card: when its lines start (ms from the card's start), and its end.
  let lineStarts: number[] = [];
  let lineIndex = -1;
  let typedAt = 0;
  let last = performance.now();
  let frame = 0;

  function startCard(index: number, now: number): void {
    cardIndex = index;
    const card = options.cards[index]!;
    texts = cardTexts(card, options.name, options.kind);
    scene = scenes.get(card.scene);
    emitters = (scene?.emitters ?? []).map((e) => new Emitter(e));
    cardStart = now;
    cardLength = cardMs(card);
    lineStarts = [];
    let at = PROLOGUE_TIMING.fade + (card.title ? PROLOGUE_TIMING.title : 0);
    for (const line of texts.lines) {
      lineStarts.push(at);
      at += lineMs(line);
    }
    lineIndex = -1;
    text.textContent = '';
    more.classList.remove('shown');
    title.textContent = texts.title ?? '';
    subtitle.textContent = texts.subtitle ?? '';
    titleBox.classList.toggle('shown', texts.title !== null);
    if (texts.title) spoken.textContent = [texts.title, texts.subtitle].filter(Boolean).join('. ');
  }

  /** Goes on: finishes the line that types, or goes to the next line (or card). */
  function advance(now: number): void {
    if (ending || cardIndex < 0) return;
    const t = now - cardStart;
    const line = texts.lines[lineIndex];
    if (line !== undefined && now - typedAt < (line.length / PROLOGUE_TIMING.typing) * 1000) {
      // Finish the typing: the line shows whole.
      typedAt = now - (line.length / PROLOGUE_TIMING.typing) * 1000;
      return;
    }
    const next = lineIndex + 1;
    if (next < texts.lines.length) {
      // Bring the next line forward to now: the rest of the time line moves with it.
      const shift = lineStarts[next]! - t;
      for (let i = next; i < lineStarts.length; i++) lineStarts[i] = lineStarts[i]! - shift;
      cardLength -= shift;
      return;
    }
    // The last line: end the card now (its fade out starts).
    cardLength = Math.min(cardLength, t + PROLOGUE_TIMING.fade);
  }

  function draw(now: number): void {
    frame = requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (ending) return;
    if (cardIndex < 0 || now - cardStart >= cardLength) {
      if (cardIndex + 1 >= options.cards.length) {
        finish();
        return;
      }
      startCard(cardIndex + 1, now);
    }
    const t = now - cardStart;
    // The lines: the one whose time has come types itself.
    while (lineIndex + 1 < lineStarts.length && t >= lineStarts[lineIndex + 1]!) {
      lineIndex++;
      typedAt = now;
      spoken.textContent = texts.lines[lineIndex]!;
      titleBox.classList.remove('shown');
    }
    const line = texts.lines[lineIndex];
    if (line !== undefined) {
      const shown = Math.min(line.length, Math.floor(((now - typedAt) / 1000) * PROLOGUE_TIMING.typing));
      if (text.textContent !== line.slice(0, shown)) text.textContent = line.slice(0, shown);
      more.classList.toggle('shown', shown >= line.length);
    }
    // The scene: its layers, panned, with what moves on each.
    const pan = Math.min(1, t / cardLength) * PROLOGUE_TIMING.pan;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const e of emitters) e.step(dt);
    scene?.layers.forEach((layer, i) => {
      const offset = Math.round(layer.depth * pan);
      ctx.drawImage(sheet, layer.x + offset, layer.y, DATA.view.w, layer.h, 0, 0, DATA.view.w, layer.h);
      for (const e of emitters) if (e.data.layer === i) e.draw(ctx, offset);
    });
    // The fades at the start and the end of a card.
    const fade = Math.max(0, 1 - t / PROLOGUE_TIMING.fade, 1 - (cardLength - t) / PROLOGUE_TIMING.fade);
    if (fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'ArrowRight') {
      // The Skip button has the focus: Enter on it skips, as a button does.
      if (event.target === skip && event.code === 'Enter') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      advance(performance.now());
      return;
    }
    // No other key reaches the game.
    if (event.code !== 'Tab') event.stopImmediatePropagation();
  };
  window.addEventListener('keydown', onKey, { capture: true });
  root.addEventListener('pointerdown', (event) => {
    if (event.target === skip) return;
    event.preventDefault();
    advance(performance.now());
  });
  skip.addEventListener('click', () => finish());

  function finish(): void {
    if (ending) return;
    ending = true;
    root.classList.add('leaving');
    setTimeout(finishNow, 450);
  }

  function finishNow(): void {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', fit);
    window.removeEventListener('keydown', onKey, { capture: true });
    root.remove();
    playing = false;
    if (before instanceof HTMLElement && before !== document.body) before.focus();
    resolveDone();
  }

  frame = requestAnimationFrame(draw);
  return done;
}
