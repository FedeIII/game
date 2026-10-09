import {
  ABILITIES,
  BASE_SCORES,
  CLASSES,
  CLASS_PRIMARY,
  GENDERS,
  HALF_ELF_CHOICES,
  NAME_MAX,
  NAME_MIN,
  POINT_BUY,
  RACES,
  RACE_BONUS,
  VARIANT_MAX,
  abilityModifier,
  appearanceSeed,
  bonusChoices,
  cleanName,
  finalScores,
  pointCost,
  pointsSpent,
  raceBonus,
  type Ability,
  type CharacterClass,
  type CharacterSheet,
  type Gender,
  type Race,
  type Scores,
} from '@game/engine';
import type { SkinStore } from '../skins/skin-store.ts';
import { STRINGS } from '../ui/strings.ts';
import { el } from './dom.ts';
import { randomName } from './names.ts';
import { SkinPortrait } from './portrait.ts';

const T = STRINGS.menu;

/** A random variant of a look (the random part of the skin seed). */
export function randomVariant(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! & VARIANT_MAX;
}

/** "+1" or "-1", with a true minus sign; "+0" for zero. */
export function signed(n: number): string {
  return n < 0 ? `−${-n}` : `+${n}`;
}

/** The increases of a race in words, the largest first: "Intelligence +2, Constitution +1". */
export function raceBonusText(race: Race): string {
  const parts = ABILITIES.filter((a) => (RACE_BONUS[race][a] ?? 0) > 0)
    .sort((a, b) => RACE_BONUS[race][b]! - RACE_BONUS[race][a]!)
    .map((a) => `${STRINGS.abilities[a].name} ${signed(RACE_BONUS[race][a]!)}`);
  if (race === 'human') return `${signed(1)} to every ability`;
  if (bonusChoices(race) > 0) parts.push(`${signed(1)} to two others`);
  return parts.join(', ');
}

/** "Strength and Constitution". */
function andList(items: readonly string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export interface BuilderCallbacks {
  /** Step 1, Back: leave the builder. */
  back(): void;
  /** Step 2, Create: the finished sheet. */
  create(sheet: CharacterSheet): void;
}

/**
 * The character builder of a new game, in two steps. 1, Appearance: race, class, gender, name, and
 * "Another look" (a new random variant of the same race, class and gender), with a preview that
 * walks. 2, Abilities: point buy from 8 (SRD 5.1), the race's increases, and a half-elf's two
 * choices. The engine's checkSheet() rules apply here too, so the server accepts what this makes.
 */
export class CharacterBuilder {
  readonly element: HTMLElement;
  private readonly skins: SkinStore;
  private readonly callbacks: BuilderCallbacks;
  private race: Race = 'human';
  private cls: CharacterClass = 'fighter';
  private gender: Gender = 'male';
  private variant = randomVariant();
  private name = '';
  private base: Record<Ability, number> = { ...BASE_SCORES };
  private bonus: Ability[] = [];
  private step: 1 | 2 = 1;
  private readonly portrait: SkinPortrait;
  private busy: string | null = null;

  constructor(skins: SkinStore, callbacks: BuilderCallbacks) {
    this.skins = skins;
    this.callbacks = callbacks;
    // A random start, so two new characters do not begin alike.
    const random = crypto.getRandomValues(new Uint32Array(3));
    this.race = RACES[random[0]! % RACES.length]!;
    this.cls = CLASSES[random[1]! % CLASSES.length]!;
    this.gender = GENDERS[random[2]! % 2]!;
    this.portrait = new SkinPortrait(skins, 3, true);
    this.element = el('section', { class: 'menu-screen builder', 'aria-labelledby': 'builder-title' });
    this.render();
  }

  /** While the menu talks to the server: the buttons wait, and `text` says why. */
  setBusy(text: string | null): void {
    this.busy = text;
    this.render();
  }

  stop(): void {
    this.portrait.stop();
  }

  private get seed(): number {
    return appearanceSeed({ race: this.race, class: this.cls, gender: this.gender, variant: this.variant });
  }

  private sheet(): CharacterSheet {
    return { name: cleanName(this.name), race: this.race, class: this.cls, gender: this.gender, variant: this.variant, base: { ...this.base }, bonus: [...this.bonus] };
  }

  private nameValid(): boolean {
    return [...cleanName(this.name)].length >= NAME_MIN;
  }

  private render(): void {
    const focused = document.activeElement?.id ?? '';
    this.element.replaceChildren(...(this.step === 1 ? this.appearance() : this.abilities()));
    if (focused) (document.getElementById(focused) as HTMLElement | null)?.focus();
  }

  /** Focuses the title of the step (screen readers announce it). */
  focusTitle(): void {
    document.getElementById('builder-title')?.focus();
  }

  // ---------------------------------------------------------------- step 1: appearance

  private appearance(): HTMLElement[] {
    const title = el('h2', { id: 'builder-title', class: 'menu-title', tabindex: '-1' }, T.newTitle);
    const step = el('p', { class: 'builder-step' }, T.step(1, 2, T.appearance));

    this.portrait.show(this.seed);
    const kind = el('p', { class: 'builder-kind' }, `${STRINGS.races[this.race].name} ${STRINGS.classes[this.cls].name.toLowerCase()}`);
    const another = el('button', { type: 'button', id: 'builder-another', class: 'menu-small' }, this.portrait.pending ? T.drawing : T.anotherLook);
    another.addEventListener('click', () => {
      this.variant = randomVariant();
      this.render();
    });
    this.portrait.onReady(() => {
      const button = document.getElementById('builder-another');
      if (button) button.textContent = T.anotherLook;
    });
    const preview = el('div', { class: 'builder-preview' }, this.portrait.element, kind, another);

    const choices = el(
      'div',
      { class: 'builder-choices' },
      this.choice('race', T.race, RACES, this.race, (r) => STRINGS.races[r].name, `${STRINGS.races[this.race].line} ${raceBonusText(this.race)}.`, (r) => {
        this.race = r;
        if (bonusChoices(r) === 0) this.bonus = [];
      }),
      this.choice('class', T.class, CLASSES, this.cls, (c) => STRINGS.classes[c].name, STRINGS.classes[this.cls].line, (c) => {
        this.cls = c;
      }),
      this.choice('gender', T.gender, GENDERS, this.gender, (g) => STRINGS.genders[g], null, (g) => {
        this.gender = g;
      }),
      this.nameField(),
    );

    const back = el('button', { type: 'button', class: 'menu-button' }, T.back);
    back.addEventListener('click', () => this.callbacks.back());
    const next = el('button', { type: 'button', id: 'builder-next', class: 'menu-button menu-primary' }, T.next);
    next.disabled = !this.nameValid();
    next.addEventListener('click', () => {
      if (!this.nameValid()) return;
      this.step = 2;
      this.render();
      this.focusTitle();
    });
    return [title, step, el('div', { class: 'builder-look' }, preview, choices), el('div', { class: 'menu-actions' }, back, next)];
  }

  /** A group of chips (radio buttons): one choice of a list. */
  private choice<V extends string>(id: string, legend: string, values: readonly V[], current: V, label: (v: V) => string, line: string | null, pick: (v: V) => void): HTMLElement {
    const chips = values.map((value) => {
      const input = el('input', { type: 'radio', name: `builder-${id}`, id: `builder-${id}-${value}`, value });
      input.checked = value === current;
      input.addEventListener('change', () => {
        pick(value);
        this.render();
      });
      return el('label', { class: 'chip', for: `builder-${id}-${value}` }, input, el('span', {}, label(value)));
    });
    return el('fieldset', { class: 'choice' }, el('legend', {}, legend), el('div', { class: 'chips' }, ...chips), ...(line ? [el('p', { class: 'choice-line' }, line)] : []));
  }

  private nameField(): HTMLElement {
    const input = el('input', {
      type: 'text',
      id: 'builder-name',
      maxlength: String(NAME_MAX),
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: T.namePlaceholder,
      'aria-describedby': 'builder-name-hint',
    });
    input.value = this.name;
    input.addEventListener('input', () => {
      this.name = input.value;
      const next = document.getElementById('builder-next') as HTMLButtonElement | null;
      if (next) next.disabled = !this.nameValid();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && this.nameValid()) document.getElementById('builder-next')?.click();
    });
    const dice = el('button', { type: 'button', id: 'builder-random-name', class: 'menu-small' }, T.randomName);
    dice.addEventListener('click', () => {
      this.name = randomName(this.race, this.gender);
      this.render();
    });
    return el(
      'div',
      { class: 'builder-name' },
      el('label', { for: 'builder-name' }, T.name),
      el('div', { class: 'builder-name-row' }, input, dice),
      el('p', { id: 'builder-name-hint', class: 'menu-hint' }, T.nameHint),
    );
  }

  // ---------------------------------------------------------------- step 2: abilities

  private abilities(): HTMLElement[] {
    const title = el('h2', { id: 'builder-title', class: 'menu-title', tabindex: '-1' }, T.newTitle);
    const step = el('p', { class: 'builder-step' }, T.step(2, 2, T.abilities));
    const left = POINT_BUY.budget - pointsSpent(this.base);
    const final = finalScores(this.base, this.race, this.bonus);
    const bonus = raceBonus(this.race, this.bonus);
    const choosing = bonusChoices(this.race);
    const primary = CLASS_PRIMARY[this.cls];

    const who = el(
      'p',
      { class: 'builder-kind' },
      `${cleanName(this.name)}, ${STRINGS.races[this.race].name.toLowerCase()} ${STRINGS.classes[this.cls].name.toLowerCase()}`,
    );
    const points = el('p', { class: `points${left === 0 ? ' points-done' : ''}`, 'aria-live': 'polite' }, T.pointsLeft(left));
    const notes = el(
      'div',
      { class: 'builder-notes' },
      el('p', { class: 'menu-hint' }, T.pointsHelp),
      el('p', { class: 'menu-hint' }, T.primary(andList(primary.map((a) => STRINGS.abilities[a].name)))),
      ...(choosing ? [el('p', { class: 'menu-hint' }, T.halfElf)] : []),
    );

    const rows = ABILITIES.map((ability) => {
      const names = STRINGS.abilities[ability];
      const score = this.base[ability];
      const upCost = score < POINT_BUY.max ? pointCost(score + 1) - pointCost(score) : Infinity;
      const lower = el('button', { type: 'button', id: `builder-${ability}-down`, class: 'step-button', 'aria-label': T.lower(names.name) }, '−');
      lower.disabled = score <= POINT_BUY.min;
      lower.addEventListener('click', () => this.setScore(ability, score - 1));
      const raise = el('button', { type: 'button', id: `builder-${ability}-up`, class: 'step-button', 'aria-label': T.raise(names.name) }, '+');
      raise.disabled = upCost > left;
      raise.addEventListener('click', () => this.setScore(ability, score + 1));

      let race: HTMLElement;
      if (choosing && ability !== HALF_ELF_CHOICES.except) {
        const chosen = this.bonus.includes(ability);
        race = el('button', { type: 'button', id: `builder-${ability}-bonus`, class: 'bonus-toggle', 'aria-pressed': String(chosen), 'aria-label': T.choose(names.name) }, signed(1));
        (race as HTMLButtonElement).disabled = !chosen && this.bonus.length >= choosing;
        race.addEventListener('click', () => {
          this.bonus = chosen ? this.bonus.filter((a) => a !== ability) : [...this.bonus, ability];
          this.render();
        });
      } else {
        race = el('span', { class: bonus[ability] ? 'bonus' : 'bonus none' }, bonus[ability] ? signed(bonus[ability]) : '–');
      }
      const label = el(
        'th',
        { scope: 'row', class: primary.includes(ability) ? 'primary' : '' },
        el('abbr', { title: names.name }, names.short),
        el('span', { class: 'ability-name' }, names.name),
      );
      return el(
        'tr',
        {},
        label,
        el('td', { class: 'base' }, lower, el('output', { 'aria-live': 'polite' }, String(score)), raise),
        el('td', { class: 'race' }, race),
        el('td', { class: 'total' }, String(final[ability])),
        el('td', { class: 'mod' }, signed(abilityModifier(final[ability]))),
      );
    });
    const c = T.columns;
    const table = el(
      'table',
      { class: 'abilities' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, c.ability), el('th', { scope: 'col' }, c.base), el('th', { scope: 'col' }, c.race), el('th', { scope: 'col' }, c.total), el('th', { scope: 'col' }, c.mod))),
      el('tbody', {}, ...rows),
    );

    const back = el('button', { type: 'button', class: 'menu-button' }, T.back);
    back.addEventListener('click', () => {
      this.step = 1;
      this.render();
      this.focusTitle();
    });
    const reset = el('button', { type: 'button', class: 'menu-button' }, T.reset);
    reset.addEventListener('click', () => {
      this.base = { ...BASE_SCORES };
      this.bonus = [];
      this.render();
    });
    const missing = choosing > 0 && this.bonus.length < choosing;
    const create = el('button', { type: 'button', id: 'builder-create', class: 'menu-button menu-primary' }, this.busy ?? T.create);
    create.disabled = missing || this.busy !== null;
    create.addEventListener('click', () => this.callbacks.create(this.sheet()));
    const note = missing ? T.chooseTwo : left > 0 ? T.unspent(left) : '';
    return [
      title,
      step,
      who,
      points,
      notes,
      table,
      el('p', { class: 'builder-note', 'aria-live': 'polite' }, note),
      el('div', { class: 'menu-actions' }, back, reset, create),
    ];
  }

  private setScore(ability: Ability, score: number): void {
    const next: Scores = { ...this.base, [ability]: score };
    if (score < POINT_BUY.min || score > POINT_BUY.max || pointsSpent(next) > POINT_BUY.budget) return;
    this.base = { ...next };
    this.render();
  }
}
