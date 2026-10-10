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
 * The player's vitals (Constitution), HTML over the canvas in the top-left corner: a red pip for
 * each hit point (dark when it is gone), a thin stamina bar under them, and the effects in words
 * (poisoned, drunk). A hit flashes the screen edges red; a defeat fades the screen to black until
 * the player wakes. Screen readers hear the hit points.
 */
export class Vitals {
  private readonly root: HTMLElement;
  private readonly pips: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly status: HTMLElement;
  private readonly hurt: HTMLElement;
  private readonly veil: HTMLElement;
  private shown = '';
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
    this.status = document.createElement('div');
    this.status.className = 'vitals-status';
    this.root.append(this.pips, bar, this.status);
    this.hurt = document.createElement('div');
    this.hurt.id = 'hurt';
    this.hurt.setAttribute('aria-hidden', 'true');
    this.veil = document.createElement('div');
    this.veil.id = 'down-veil';
    this.veil.setAttribute('aria-hidden', 'true');
    document.body.append(this.root, this.hurt, this.veil);
  }

  /** Shows the vitals of the player: `maxHp` pips, and the stamina as a share of `maxStamina`. */
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
    this.pips.replaceChildren();
    for (let i = 0; i < maxHp; i++) {
      const pip = document.createElement('span');
      pip.className = i < signs.hp ? 'vitals-pip full' : 'vitals-pip';
      this.pips.append(pip);
    }
    this.pips.setAttribute('aria-label', text.hp(signs.hp, maxHp));
    this.status.textContent = effects.join(' · ');
  }
}
