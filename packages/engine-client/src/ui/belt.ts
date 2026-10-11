import { DRINKS, gateView, type ItemKind, type Pack, type Scores } from '@game/engine';
import type { Art } from '../assets.ts';
import { isFormField } from '../input/keyboard.ts';
import { drawIcon } from './icons.ts';
import { STRINGS } from './strings.ts';

/** The drinks of the belt, in the order of their keys: 1 a healing draught, 2 a strong draught, 3 an antidote, 4 herbs (Medicine). */
export const BELT: readonly ItemKind[] = ['draught', 'strong-draught', 'antidote', 'herbs'];

/** The key of a drink on the belt (1 to 4), or 0 for a kind that is not a drink. */
export function beltKey(kind: ItemKind): number {
  return BELT.indexOf(kind) + 1;
}

/**
 * How the use of an item shows for a character with `scores` (the gate rule, gateView): 'open' (a
 * drink that it can use), 'hint' (a drink behind a gate that it is 1 or 2 short of: herbs without
 * Medicine), or 'hidden' (no use).
 */
export function drinkView(kind: ItemKind, scores: Scores): ReturnType<typeof gateView> {
  const drink = DRINKS[kind];
  if (!drink) return 'hidden';
  return drink.gate ? gateView(scores, drink.gate) : 'open';
}

/** The tooltip of a drink: "Drink a healing draught (1)", or for herbs "Chew a bundle of herbs (4)". */
export function drinkTitle(kind: ItemKind): string {
  const what = STRINGS.items[kind].a;
  return (DRINKS[kind]?.gate ? STRINGS.pack.chew : STRINGS.pack.drink)(what, beltKey(kind));
}

/** How many items of `kind` a pack holds, in all its slots. */
export function countOf(pack: Pack, kind: ItemKind): number {
  return pack.items.reduce((n, s) => (s?.kind === kind ? n + s.count : n), 0);
}

/**
 * The drink belt: under the hit points (top left), one button for each drink that the character
 * carries and can use, with the count. A press drinks one, and so does its key (1 to 4), at any
 * time: the panel does not need to be open. The conversation panel takes the digits first while it
 * is open. On a touch screen the buttons show no keys.
 */
export class DrinkBelt {
  private readonly art: Art;
  private readonly root: HTMLElement;
  private scores: Scores;
  private readonly onDrink: (kind: ItemKind) => void;
  private shown = '';

  constructor(art: Art, parent: HTMLElement, scores: Scores, onDrink: (kind: ItemKind) => void) {
    this.art = art;
    this.scores = scores;
    this.onDrink = onDrink;
    this.root = document.createElement('div');
    this.root.id = 'belt';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', STRINGS.pack.belt);
    this.root.hidden = true;
    parent.append(this.root);
    window.addEventListener('keydown', (event) => {
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
      if (!digit || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      const kind = BELT[Number(digit[1]) - 1];
      if (!kind) return;
      event.preventDefault();
      if (drinkView(kind, this.scores) === 'open') this.onDrink(kind);
    });
    // Give the focus back after a press, so WASD moves the player again at once.
    this.root.addEventListener('click', () => setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0));
  }

  /** New scores for the gates (the luck of the gear changed). */
  setScores(scores: Scores): void {
    this.scores = scores;
    this.shown = '';
  }

  /** Shows the drinks of `pack`. */
  show(pack: Pack): void {
    const drinks = BELT.map((kind) => [kind, countOf(pack, kind)] as const).filter(([kind, n]) => n > 0 && drinkView(kind, this.scores) === 'open');
    const key = JSON.stringify(drinks);
    if (key === this.shown) return;
    this.shown = key;
    this.root.replaceChildren();
    for (const [kind, n] of drinks) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'belt-drink';
      button.dataset.kind = kind;
      button.title = drinkTitle(kind);
      button.setAttribute('aria-label', `${button.title}, ${STRINGS.pack.stack(n, STRINGS.items[kind])}`);
      button.setAttribute('aria-keyshortcuts', String(beltKey(kind)));
      const icon = document.createElement('canvas');
      icon.setAttribute('aria-hidden', 'true');
      drawIcon(icon, this.art.frame(`item/${kind}`));
      const count = document.createElement('span');
      count.className = 'belt-count';
      count.textContent = String(n);
      const hotkey = document.createElement('span');
      hotkey.className = 'belt-key';
      hotkey.textContent = String(beltKey(kind));
      button.append(icon, count, hotkey);
      button.addEventListener('click', () => this.onDrink(kind));
      this.root.append(button);
    }
    this.root.hidden = drinks.length === 0;
  }
}
