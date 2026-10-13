import type { LevelProgress } from '@game/engine';
import { STRINGS } from './strings.ts';

/** What the vitals show of the player (PlayerState). */
export interface VitalSigns {
  readonly hp: number;
  readonly stamina: number;
  readonly poison: number;
  readonly drunk: number;
  readonly down: number;
}

/** The red flash at the screen edges lasts this long (ms). */
const HURT_MS = 450;

/**
 * The player's vitals (Constitution), HTML over the canvas in the top-left corner: a red bar of the
 * hit points with their numbers ("17 / 28"), a thin stamina bar under it, the level and a thin gold
 * bar of the way to the next level (experience.ts, since 2026-10-14), and the effects in words
 * (poisoned, drunk). A hit flashes the screen edges red; a defeat fades the screen to black until
 * the player wakes. Screen readers hear the hit points, the level, and a new level.
 */
export class Vitals {
  private readonly root: HTMLElement;
  private readonly pips: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly status: HTMLElement;
  private readonly hurt: HTMLElement;
  private readonly veil: HTMLElement;
  private readonly level: HTMLElement;
  private readonly levelNumber: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly spoken: HTMLElement;
  private shown = '';
  private shownLevel = '';
  private lastHp: number | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'vitals';
    this.pips = document.createElement('div');
    this.pips.className = 'vitals-hp';
    this.pips.setAttribute('role', 'img');
    const bar = document.createElement('div');
    bar.className = 'vitals-stamina';
    bar.setAttribute('aria-hidden', 'true');
    this.fill = document.createElement('div');
    this.fill.className = 'vitals-stamina-fill';
    bar.append(this.fill);
    this.level = document.createElement('div');
    this.level.className = 'vitals-level';
    this.level.setAttribute('role', 'img');
    this.levelNumber = document.createElement('span');
    this.levelNumber.className = 'vitals-level-number';
    this.levelNumber.setAttribute('aria-hidden', 'true');
    const xpBar = document.createElement('div');
    xpBar.className = 'vitals-xp';
    xpBar.setAttribute('aria-hidden', 'true');
    this.xpFill = document.createElement('div');
    this.xpFill.className = 'vitals-xp-fill';
    xpBar.append(this.xpFill);
    this.level.append(this.levelNumber, xpBar);
    this.status = document.createElement('div');
    this.status.className = 'vitals-status';
    this.spoken = document.createElement('div');
    this.spoken.className = 'sr-only';
    this.spoken.setAttribute('role', 'status');
    this.spoken.setAttribute('aria-live', 'polite');
    this.root.append(this.pips, bar, this.level, this.status, this.spoken);
    this.hurt = document.createElement('div');
    this.hurt.id = 'hurt';
    this.hurt.setAttribute('aria-hidden', 'true');
    this.veil = document.createElement('div');
    this.veil.id = 'down-veil';
    this.veil.setAttribute('aria-hidden', 'true');
    document.body.append(this.root, this.hurt, this.veil);
  }

  /** The box in the top-left corner, for what goes under the vitals (the drink belt). */
  get element(): HTMLElement {
    return this.root;
  }

  /** Shows the level of the character, and the share of the way to the next one. */
  setLevel(progress: LevelProgress): void {
    const key = `${progress.level}/${progress.xp}`;
    if (key === this.shownLevel) return;
    this.shownLevel = key;
    this.levelNumber.textContent = STRINGS.vitals.level(progress.level);
    this.xpFill.style.width = `${Math.round(100 * progress.share)}%`;
    this.level.setAttribute('aria-label', STRINGS.vitals.xp(progress.level, progress.xp, progress.to));
  }

  /** Screen readers hear a line (a new level). */
  announce(text: string): void {
    this.spoken.textContent = text;
  }

  /** Shows the vitals of the player: its hit points as a share of `maxHp`, with the numbers, and the stamina as a share of `maxStamina`. */
  update(signs: VitalSigns, maxHp: number, maxStamina: number): void {
    const text = STRINGS.vitals;
    if (this.lastHp !== null && signs.hp < this.lastHp) {
      // Restart the flash: take the class away, force a style pass, put it back.
      this.hurt.classList.remove('flash');
      void this.hurt.offsetWidth;
      this.hurt.classList.add('flash');
      setTimeout(() => this.hurt.classList.remove('flash'), HURT_MS);
    }
    this.lastHp = signs.hp;
    this.veil.classList.toggle('on', signs.down > 0);
    this.fill.style.width = `${Math.round((100 * Math.max(0, signs.stamina)) / maxStamina)}%`;
    const effects = [...(signs.poison > 0 ? [text.poisoned] : []), ...(signs.drunk > 0 ? [text.drunk] : [])];
    const key = `${signs.hp}/${maxHp}/${effects.join()}`;
    if (key === this.shown) return;
    this.shown = key;
    const fill = document.createElement('span');
    fill.className = 'vitals-hp-fill';
    fill.style.width = `${Math.round((100 * Math.max(0, Math.min(signs.hp, maxHp))) / maxHp)}%`;
    const numbers = document.createElement('span');
    numbers.className = 'vitals-hp-numbers';
    numbers.textContent = `${signs.hp} / ${maxHp}`;
    this.pips.replaceChildren(fill, numbers);
    this.pips.setAttribute('aria-label', text.hp(signs.hp, maxHp));
    this.status.textContent = effects.join(' · ');
  }
}
