import type { PrologueCard } from '@game/engine';
import { audio } from '../audio/audio.ts';
import type { MusicTrack } from '../audio/music.ts';
import { CHORD_BEATS, CODA_INSTRUMENTS, KANDRAX_BPM, KANDRAX_CODA, KANDRAX_OPENING, KANDRAX_RISE, RISE_FIRST, THEME_FIRST } from '../audio/themes/kandrax.ts';
import { AMBIENCES, EFFECT_INSTRUMENTS, type AmbienceId } from '../audio/sounds.ts';
import prologueData from '../generated/prologue.json';
import { LANG, tw } from '../i18n.ts';
import { STRINGS } from './strings.ts';

/**
 * The prologue (Fede's request, 2026-10-12): the world's cards of text (WorldDefinition.prologue)
 * over painted scenes of Kandrax (art/prologue.ts, an atlas of its own that loads only now). Each
 * scene pans slowly, the near layers more than the far ones, and its emitters add what moves: stars
 * that twinkle, smoke, embers, fireflies, motes of light, birds, mist and a candle's flame. A tall
 * layer rises (the map: the view goes from its north to its south). A card can have a banner: a name
 * over the scene in the game's pixel font, as the name of a world on arrival (render/intro.ts).
 *
 * The lines of a card type themselves from left to right, one under the other, and go on by
 * themselves; a click, a tap, Space, Enter or the right arrow finishes a line or goes to the next
 * one. The box of the text has the place of the longest card from the start, so nothing moves while
 * a line types. The scene and the text share the screen: the text under the scene, or beside it on a
 * wide, short screen (a phone on its side), whichever gives the larger scene with all the text in
 * view. "Skip" or Escape ends the prologue at once.
 *
 * Its sound (audio/): the theme of Kandrax from the first scene to the end (its opening, its rise with
 * the gods, and its quiet coda with the last card), the ambience of each scene
 * (the night, the wind, a candle, the forge, a hearth), a rush of air at each new card, a strike and
 * bells for a title, the scratch of a quill as a line types, and a chord at the end. A speaker button
 * by "Skip" turns all sound on and off (the setting of the whole game).
 */

interface LayerData {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly depth: number;
  /** How far it rises over a card (pixels). */
  readonly rise?: number;
  /** The language that it is for (the labels of a map). */
  readonly lang?: string;
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
  /** The sound under the scene (audio/sounds.ts). */
  readonly ambience?: string;
}

/** The ambience of a scene, if it names one that the engine has. */
export function sceneAmbience(scene: Pick<SceneData, 'ambience'> | undefined): AmbienceId | null {
  const id = scene?.ambience;
  return id !== undefined && (AMBIENCES as readonly string[]).includes(id) ? (id as AmbienceId) : null;
}

/** A speaker, with waves (sound on) or a cross (sound off). */
const speaker = (on: boolean) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/>${
    on ? '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M17.8 7.2a6.8 6.8 0 0 1 0 9.6"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'
  }</svg>`;

/** The pixel font in the sheet (art/font.ts): the place of each glyph, by its character code. */
interface FontData {
  readonly height: number;
  readonly lineHeight: number;
  readonly spacing: number;
  readonly glyphs: Readonly<Record<string, readonly [number, number, number, number]>>;
}

const DATA = prologueData as unknown as {
  readonly view: { readonly w: number; readonly h: number };
  readonly font: FontData;
  readonly scenes: readonly SceneData[];
};
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

/**
 * The banner of a card: the times, the size and the colours of the name of a world on arrival
 * (render/intro.ts). Before the first line, it starts as the scene fades in (`start`), and the first
 * line starts as it fades out; with a later line (`PrologueCard.bannerLine`), it starts with that line.
 */
export const PROLOGUE_BANNER = {
  start: 500,
  fadeIn: 650,
  hold: 1450,
  fadeOut: 800,
  /** Pixels of the art for each pixel of the font. */
  scale: 2,
  /** The row of its middle (pixels of the art): over the sky, above the landmarks. */
  row: 47,
  /** The lines are this much longer than the name (pixels of the art). */
  overhang: 28,
  ink: '#d8ccb0',
  shadow: '#07050a',
  line: '#9a3a36',
} as const;

/** How long a line stays, typed and read (ms). */
export function lineMs(line: string): number {
  return (line.length / PROLOGUE_TIMING.typing) * 1000 + PROLOGUE_TIMING.read + line.length * PROLOGUE_TIMING.readPerChar;
}

/** The line with which a card's banner shows (0: before the first line), or null without a banner. */
export function bannerLineOf(card: Pick<PrologueCard, 'banner' | 'bannerLine'>): number | null {
  return card.banner ? (card.bannerLine ?? 0) : null;
}

/** The time before the first line of a card: its fade in, and its title or a banner that comes first. */
function leadMs(card: Pick<PrologueCard, 'title' | 'banner' | 'bannerLine'>): number {
  return PROLOGUE_TIMING.fade + (card.title || bannerLineOf(card) === 0 ? PROLOGUE_TIMING.title : 0);
}

/** How long a card lasts with nobody hurrying it (ms): its fades, its title or banner, and its lines. */
export function cardMs(card: Pick<PrologueCard, 'title' | 'banner' | 'bannerLine' | 'lines'>): number {
  return leadMs(card) + PROLOGUE_TIMING.fade + card.lines.reduce((sum, line) => sum + lineMs(line), 0);
}

/** A card's texts in the page's language, with {name} and {kind} filled in. */
export function cardTexts(
  card: PrologueCard,
  name: string,
  kind: string,
): { title: string | null; subtitle: string | null; banner: string | null; lines: string[] } {
  const fill = (text: string) => tw(text).replaceAll('{name}', name).replaceAll('{kind}', kind);
  const maybe = (text: string | undefined) => (text ? fill(text) : null);
  return { title: maybe(card.title), subtitle: maybe(card.subtitle), banner: maybe(card.banner), lines: card.lines.map(fill) };
}

/** How far a layer moves, from the time of the card (0 to 1): across with its depth, and up with its rise. */
export function layerOffset(layer: Pick<LayerData, 'depth' | 'rise'>, progress: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, progress));
  return { x: Math.round(layer.depth * t * PROLOGUE_TIMING.pan), y: Math.round((layer.rise ?? 0) * t) };
}

/** Whether a layer shows in a language: a layer without a language shows in every one. */
export function layerShows(layer: Pick<LayerData, 'lang'>, lang: string): boolean {
  return layer.lang === undefined || layer.lang === lang;
}

// ---------------------------------------------------------------- the banner

/** Typographic characters that the font draws as plain ones (as render/pixel-text.ts does). */
const PLAIN: Readonly<Record<string, string>> = { '‘': "'", '’': "'", '“': '"', '”': '"', '…': '.', '«': '"', '»': '"' };

/** The place of a character's glyph in the sheet: the glyph, else the plain character (no accent), else the fallback. */
function glyphOf(ch: string): readonly [number, number, number, number] | undefined {
  const glyphs = DATA.font.glyphs;
  const plain = PLAIN[ch] ?? ch.normalize('NFD')[0] ?? ch;
  return glyphs[String(ch.codePointAt(0))] ?? glyphs[String(plain.codePointAt(0))] ?? glyphs.fallback;
}

/** The width of a text in the pixel font (pixels of the font). */
export function bannerWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += (glyphOf(ch)?.[2] ?? 0) + DATA.font.spacing;
  return Math.max(0, width - DATA.font.spacing);
}

/** A banner's name in the pixel font, with its shadow one pixel down and right, at the font's own size. */
function bannerImage(sheet: CanvasImageSource, text: string): HTMLCanvasElement {
  const width = bannerWidth(text) + 1;
  const height = DATA.font.height + 1;
  const tinted = (colour: string, dx: number, dy: number) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const g = c.getContext('2d')!;
    let x = dx;
    for (const ch of text) {
      const glyph = glyphOf(ch);
      if (!glyph) continue;
      const [gx, gy, gw, gh] = glyph;
      g.drawImage(sheet, gx, gy, gw, gh, x, dy, gw, gh);
      x += gw + DATA.font.spacing;
    }
    // The glyphs are white: the colour takes their shape.
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = colour;
    g.fillRect(0, 0, width, height);
    g.globalCompositeOperation = 'source-over';
    return c;
  };
  const image = tinted(PROLOGUE_BANNER.shadow, 1, 1);
  image.getContext('2d')!.drawImage(tinted(PROLOGUE_BANNER.ink, 0, 0), 0, 0);
  return image;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Draws a banner `local` ms after it starts: a dark band, two lines that grow from the centre, and the name, which rises a little as it fades in. */
function drawBanner(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, local: number): void {
  const B = PROLOGUE_BANNER;
  if (local < 0 || local >= B.fadeIn + B.hold + B.fadeOut) return;
  const appear = easeOut(Math.min(1, local / B.fadeIn));
  const alpha = local < B.fadeIn + B.hold ? appear : 1 - (local - B.fadeIn - B.hold) / B.fadeOut;
  const textW = (image.width - 1) * B.scale;
  const textH = DATA.font.height * B.scale;
  const cx = Math.round(DATA.view.w / 2);
  const cy = B.row;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha) * 0.55;
  ctx.fillStyle = B.shadow;
  const bandH = textH + 22;
  ctx.fillRect(0, Math.round(cy - bandH / 2), DATA.view.w, bandH);
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = B.line;
  const lineW = 2 * Math.round(((textW + B.overhang) / 2) * easeOut(Math.min(1, local / (B.fadeIn * 1.4))));
  ctx.fillRect(cx - lineW / 2, Math.round(cy - textH / 2 - 6), lineW, 1);
  ctx.fillRect(cx - lineW / 2, Math.round(cy + textH / 2 + 5), lineW, 1);
  const rise = Math.round((1 - appear) * 6);
  ctx.drawImage(image, Math.round(cx - textW / 2), Math.round(cy - textH / 2) + rise, image.width * B.scale, image.height * B.scale);
  ctx.restore();
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

  /** Draws the particles on the layer, which the pan moved `ox` to the left and `oy` up. */
  draw(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    const d = this.data;
    const [r, g, b] = this.rgb;
    const dot = (x: number, y: number, a: number, size = 1) => {
      if (a <= 0) return;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a)})`;
      ctx.fillRect(Math.round(x - ox), Math.round(y - oy), size, size);
    };
    if (d.kind === 'flame') {
      const x = Math.round(d.x + d.w / 2 - ox);
      const base = d.y + d.h - oy;
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
          ctx.ellipse(p.x - ox, p.y - oy, 28, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default:
          break;
      }
    }
  }
}

// ---------------------------------------------------------------- the layout

/**
 * The room between the scene and the text, the room of the buttons at the top right (below the page's
 * margin; a column beside the scene starts under them), the smallest scale of a good layout, and the
 * widths of the text (px; a column beside the scene takes a share of the width).
 */
const LAYOUT = {
  gap: 18,
  controls: 38,
  smallest: 0.5,
  narrowest: 300,
  widest: 820,
  sideMin: 220,
  sideMax: 460,
  sideShares: [0.3, 0.34, 0.38, 0.42, 0.46, 0.5],
} as const;

export interface PrologueLayout {
  /** The text beside the scene (true), or under it. */
  readonly side: boolean;
  /** Screen pixels for each pixel of the art. */
  readonly scale: number;
  readonly textWidth: number;
  readonly textHeight: number;
  /** Whether the longest card fits in the box of the text (else the box scrolls). */
  readonly fits: boolean;
}

/**
 * Where the scene and the text go in a space of `width` x `height` pixels. `need` gives the height
 * of the longest card in a box of the text of a given width. The text goes under the scene, as
 * wide as the scene (but not too narrow or too wide to read), or beside it in a column on a wide,
 * short screen; the choice gives the larger scene with all the text in view. A scale of 2 or more
 * is a whole number, so that the pixels of the art stay sharp.
 */
export function prologueLayout(width: number, height: number, need: (textWidth: number) => number): PrologueLayout {
  const { w, h } = DATA.view;
  const whole = (scale: number) => (scale >= 2 ? Math.floor(scale) : scale);
  const underWidth = (sceneWidth: number) => Math.min(width, Math.max(LAYOUT.narrowest, Math.min(sceneWidth, LAYOUT.widest)));
  let scale = whole(width / w);
  let textWidth = underWidth(w * scale);
  let textHeight = need(textWidth);
  // The scene and the text take room from each other: a few rounds find the balance.
  for (let round = 0; round < 4; round++) {
    scale = whole(Math.max(0.1, Math.min(width / w, (height - LAYOUT.gap - textHeight) / h)));
    textWidth = underWidth(w * scale);
    textHeight = need(textWidth);
  }
  let best: PrologueLayout | null =
    scale >= LAYOUT.smallest && h * scale + LAYOUT.gap + textHeight <= height + 0.5 ? { side: false, scale, textWidth, textHeight, fits: true } : null;
  // Beside the scene: the scene and the column are under the buttons at the top right.
  const sideRoom = height - LAYOUT.controls;
  const sideScale = (sideWidth: number) => whole(Math.min((width - LAYOUT.gap - sideWidth) / w, sideRoom / h));
  for (const share of LAYOUT.sideShares) {
    const sideWidth = Math.round(Math.min(LAYOUT.sideMax, Math.max(LAYOUT.sideMin, width * share)));
    const sideHeight = need(sideWidth);
    const scaleBeside = sideScale(sideWidth);
    if (sideHeight <= sideRoom && scaleBeside >= LAYOUT.smallest && (!best || scaleBeside > best.scale)) {
      best = { side: true, scale: scaleBeside, textWidth: sideWidth, textHeight: sideHeight, fits: true };
    }
  }
  if (best) return best;
  // Nothing fits (a very small screen): the text scrolls, beside the scene on a wide screen, else under it.
  if (width > height) {
    const sideWidth = Math.round(width * 0.5);
    return { side: true, scale: sideScale(sideWidth), textWidth: sideWidth, textHeight: Math.max(40, Math.floor(sideRoom)), fits: false };
  }
  const small = whole(Math.min(width / w, (height * 0.55) / h));
  return { side: false, scale: small, textWidth: underWidth(w * small), textHeight: Math.max(40, Math.floor(height - LAYOUT.gap - h * small)), fits: false };
}

/** One line of a card in the box of the text: the typed part, the part still to type (hidden, but in its place), and the arrow. */
interface Row {
  readonly p: HTMLParagraphElement;
  readonly typed: HTMLSpanElement;
  readonly rest: HTMLSpanElement;
  readonly more: HTMLSpanElement;
}

/** The rows of a card's lines, with nothing typed: each line has its final place from the start. */
function rowsOf(lines: readonly string[]): Row[] {
  return lines.map((line) => {
    const p = document.createElement('p');
    const typed = document.createElement('span');
    const rest = document.createElement('span');
    rest.className = 'prologue-rest';
    rest.textContent = line;
    const more = document.createElement('span');
    more.className = 'prologue-more';
    // A space that does not break: the arrow never goes to a row of its own.
    more.textContent = '\u00a0▸';
    p.append(typed, rest, more);
    return { p, typed, rest, more };
  });
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

/** Where this browser keeps that the prologue played once: then the menu offers it again. */
const SEEN_KEY = 'game.prologue.v1';

/** Whether this browser played the prologue once (to its end, or until "Skip"). */
export function prologueSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'seen';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, 'seen');
  } catch {
    // Storage is blocked: the menu does not offer the prologue.
  }
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
  const text = document.createElement('div');
  text.className = 'prologue-text';
  text.setAttribute('aria-hidden', 'true');
  const content = document.createElement('div');
  content.className = 'prologue-content';
  content.append(stage, text);
  const spoken = document.createElement('p');
  spoken.className = 'sr-only';
  spoken.setAttribute('aria-live', 'polite');
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'prologue-skip';
  skip.textContent = T.skip;
  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'prologue-sound';
  const showSound = () => {
    const on = !audio.settings.muted;
    sound.innerHTML = speaker(on);
    // A toggle keeps its name ("Sound"); aria-pressed says the state, the tooltip says it in words.
    sound.setAttribute('aria-label', STRINGS.sound.heading);
    sound.setAttribute('aria-pressed', String(on));
    sound.title = on ? T.soundOn : T.soundOff;
  };
  showSound();
  sound.addEventListener('click', () => {
    audio.resume();
    audio.setSettings({ ...audio.settings, muted: !audio.settings.muted });
  });
  root.append(content, spoken, sound, skip);
  document.body.append(root);
  playing = true;
  const before = document.activeElement;
  skip.focus();

  // The size: the largest scene that leaves room for the longest card (prologueLayout()). A hidden
  // box with the look of the text measures the cards at each width.
  const allTexts = options.cards.map((card) => cardTexts(card, options.name, options.kind));
  const measurer = document.createElement('div');
  measurer.className = 'prologue-text prologue-measure';
  measurer.setAttribute('aria-hidden', 'true');
  root.append(measurer);
  const fit = () => {
    const style = getComputedStyle(root);
    const width = root.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
    const height = root.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
    const heights = new Map<number, number>();
    const need = (textWidth: number) => {
      const key = Math.floor(textWidth);
      let most = heights.get(key);
      if (most === undefined) {
        measurer.style.width = `${key}px`;
        most = 0;
        for (const texts of allTexts) {
          measurer.replaceChildren(...rowsOf(texts.lines).map((row) => row.p));
          most = Math.max(most, measurer.scrollHeight);
        }
        heights.set(key, most + 2);
      }
      return heights.get(key)!;
    };
    const layout = prologueLayout(width, height, need);
    measurer.replaceChildren();
    content.classList.toggle('side', layout.side);
    const sceneWidth = Math.round(DATA.view.w * layout.scale);
    canvas.style.width = `${sceneWidth}px`;
    canvas.style.height = `${Math.round(DATA.view.h * layout.scale)}px`;
    stage.style.setProperty('--stage-width', `${sceneWidth}px`);
    text.style.width = `${Math.floor(layout.textWidth)}px`;
    text.style.height = `${Math.floor(layout.textHeight)}px`;
  };
  fit();
  window.addEventListener('resize', fit);

  // The orchestra loads with the art: the first instruments of the theme, and those of the effects.
  audio.preload([...THEME_FIRST, ...EFFECT_INSTRUMENTS]);
  // The instruments of the rise and of the coda load meanwhile: each must start at once when its card comes.
  audio.preload([...RISE_FIRST, ...CODA_INSTRUMENTS]);
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
  // The opening of the theme, round and round until the card of the rise (themes/kandrax.ts).
  audio.playMusic(KANDRAX_OPENING, 3);
  const unfollow = audio.onSettings(showSound);
  const scenes = new Map(DATA.scenes.map((s) => [s.id, s]));

  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  let ending = false;
  let cardIndex = -1;
  let cardStart = 0;
  /** When the player asked to leave the card (ms from its start): its fade out runs from there. Null: the card waits. */
  let leaveAt: number | null = null;
  /** The part of the theme that plays (or is about to): the opening, the rise, or the coda. */
  let part: 'opening' | 'rise' | 'coda' = 'opening';
  let musicTimer = 0;
  let scene: SceneData | undefined;
  let emitters: Emitter[] = [];
  let texts: ReturnType<typeof cardTexts> = { title: null, subtitle: null, banner: null, lines: [] };
  let rows: Row[] = [];
  let banner: HTMLCanvasElement | null = null;
  /** The line with which the banner shows (-1: none), and when it started (ms from the card's start). */
  let bannerLine = -1;
  let bannerAt: number | null = null;
  // The time line of the card: when its lines start (ms from the card's start). The pan follows the
  // card's own length to the end of its last line, so a line that comes early does not make the scene
  // jump; then the scene stands still and waits for the player (Fede, 2026-10-13).
  let lineStarts: number[] = [];
  let panLength = 1;
  let lineIndex = -1;
  let typedAt = 0;
  /** How much of the line had its quill scratch, and when the last one played. */
  let ticked = 0;
  let tickAt = 0;
  let skipped = false;
  let last = performance.now();
  let frame = 0;

  function startCard(index: number, now: number): void {
    cardIndex = index;
    const card = options.cards[index]!;
    texts = cardTexts(card, options.name, options.kind);
    scene = scenes.get(card.scene);
    emitters = (scene?.emitters ?? []).map((e) => new Emitter(e));
    cardStart = now;
    leaveAt = null;
    panLength = cardMs(card) - PROLOGUE_TIMING.fade;
    lineStarts = [];
    let at = leadMs(card);
    for (const line of texts.lines) {
      lineStarts.push(at);
      at += lineMs(line);
    }
    lineIndex = -1;
    rows = rowsOf(texts.lines);
    text.replaceChildren(...rows.map((row) => row.p));
    text.scrollTop = 0;
    title.textContent = texts.title ?? '';
    subtitle.textContent = texts.subtitle ?? '';
    titleBox.classList.toggle('shown', texts.title !== null);
    banner = texts.banner ? bannerImage(sheet, texts.banner) : null;
    bannerLine = bannerLineOf(card) ?? -1;
    bannerAt = bannerLine === 0 ? PROLOGUE_BANNER.start : null;
    const heading = texts.title ? [texts.title, texts.subtitle] : bannerLine === 0 ? [texts.banner] : [];
    if (heading[0]) spoken.textContent = heading.filter(Boolean).join('. ');
    audio.setAmbience(sceneAmbience(scene));
    if (index > 0) audio.play('whoosh');
    if (texts.title) audio.play('title', PROLOGUE_TIMING.fade / 1000 - 0.2);
    else if (bannerLine === 0) audio.play('title', PROLOGUE_BANNER.start / 1000);
    if (card.crescendo && part === 'opening') changeMusic('rise', KANDRAX_RISE, 2);
    if (card.calm && part !== 'coda') changeMusic('coda', KANDRAX_CODA, 3);
    ticked = 0;
  }

  /**
   * Another part of the theme with this card, however long the player took to reach it (Fede,
   * 2026-10-13): the rise (its choir and violins) with the gods, the coda with the last card. It comes
   * in on the next chord of the music that plays when it is near, else on its next beat, with a
   * crossfade of `fade` s. Without music yet (it loads, or the sound is off), it is what plays next. A
   * change that waits for its beat gives way to a later one.
   */
  function changeMusic(next: typeof part, track: MusicTrack, fade: number): void {
    part = next;
    window.clearTimeout(musicTimer);
    const beat = audio.nextMusicBeat(KANDRAX_BPM, CHORD_BEATS, 2.5);
    if (!beat) {
      audio.playMusic(track, fade);
      return;
    }
    // Ask a moment before the beat: the notes of the music that are already set reach it.
    musicTimer = window.setTimeout(() => !ending && audio.playMusic(track, fade, beat.at), Math.max(0, beat.wait - 0.3) * 1000);
  }

  /**
   * Goes on: finishes the line that types, or brings the next line now, or (after the last line) leaves
   * the card. Only this leaves a card: the lines of a card come by themselves, the next card does not.
   */
  function advance(now: number): void {
    if (ending || cardIndex < 0 || leaveAt !== null) return;
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
      return;
    }
    // The last line is whole: leave the card (its fade out starts).
    leaveAt = t;
  }

  function draw(now: number): void {
    frame = requestAnimationFrame(draw);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (ending) return;
    if (cardIndex < 0 || (leaveAt !== null && now - cardStart >= leaveAt + PROLOGUE_TIMING.fade)) {
      if (cardIndex + 1 >= options.cards.length) {
        finish();
        return;
      }
      startCard(cardIndex + 1, now);
    }
    const t = now - cardStart;
    // The lines: the one whose time has come types itself under the ones before it, which stay.
    while (lineIndex + 1 < lineStarts.length && t >= lineStarts[lineIndex + 1]!) {
      const before = rows[lineIndex];
      if (before) {
        before.typed.textContent = texts.lines[lineIndex]!;
        before.rest.textContent = '';
        before.more.classList.remove('shown');
        before.p.classList.add('past');
      }
      lineIndex++;
      typedAt = now;
      ticked = 0;
      spoken.textContent = texts.lines[lineIndex]!;
      titleBox.classList.remove('shown');
      // A banner that waits for this line (the line that names the place) shows now.
      if (lineIndex === bannerLine && bannerLine > 0) {
        bannerAt = t;
        audio.play('title');
        spoken.textContent = `${texts.banner}. ${texts.lines[lineIndex]}`;
      }
    }
    const line = texts.lines[lineIndex];
    const row = rows[lineIndex];
    if (line !== undefined && row) {
      const shown = Math.min(line.length, Math.floor(((now - typedAt) / 1000) * PROLOGUE_TIMING.typing));
      if (row.typed.textContent!.length !== shown) {
        row.typed.textContent = line.slice(0, shown);
        row.rest.textContent = line.slice(shown);
        // A box too small for the card (a tiny screen) scrolls: the line that types stays in view.
        const below = row.p.offsetTop + row.p.offsetHeight - text.clientHeight;
        if (below > text.scrollTop) text.scrollTop = below;
      }
      row.more.classList.toggle('shown', shown >= line.length);
      // The quill: a scratch for about every third letter, never too close together.
      if (shown - ticked >= 3 && now - tickAt > 55) {
        ticked = shown;
        tickAt = now;
        if (line[shown - 1] !== ' ') audio.play('tick');
      }
    }
    // The scene: its layers, panned (and risen), with what moves on each; the labels of the page's language only.
    const progress = Math.min(1, t / panLength);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const e of emitters) e.step(dt);
    scene?.layers.forEach((layer, i) => {
      if (!layerShows(layer, LANG)) return;
      const off = layerOffset(layer, progress);
      const height = Math.min(DATA.view.h, layer.h - off.y);
      ctx.drawImage(sheet, layer.x + off.x, layer.y + off.y, DATA.view.w, height, 0, 0, DATA.view.w, height);
      for (const e of emitters) if (e.data.layer === i) e.draw(ctx, off.x, off.y);
    });
    if (banner && bannerAt !== null) drawBanner(ctx, banner, t - bannerAt);
    // The fades at the start and the end of a card (the end only after the player asked for it).
    const fade = Math.max(0, 1 - t / PROLOGUE_TIMING.fade, leaveAt === null ? 0 : (t - leaveAt) / PROLOGUE_TIMING.fade);
    if (fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      skipped = true;
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
    if (event.target instanceof Node && (skip.contains(event.target) || sound.contains(event.target))) return;
    event.preventDefault();
    advance(performance.now());
  });
  skip.addEventListener('click', () => {
    skipped = true;
    finish();
  });

  function finish(): void {
    if (ending) return;
    ending = true;
    // The music and the sounds of the scene fade away; a prologue that ends by itself ends on a chord.
    if (skipped) audio.play('click');
    else audio.play('end');
    audio.stopMusic(skipped ? 1.4 : 4);
    audio.setAmbience(null, skipped ? 1 : 3);
    root.classList.add('leaving');
    setTimeout(finishNow, 450);
  }

  function finishNow(): void {
    markSeen();
    window.clearTimeout(musicTimer);
    unfollow();
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
