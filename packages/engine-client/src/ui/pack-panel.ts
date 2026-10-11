import { DRINKS, ITEM_STACK, PLAIN_SCORES, usedSlots, type ItemKind, type Pack, type PackSlot, type Scores } from '@game/engine';
import type { Art } from '../assets.ts';
import { isFormField } from '../input/keyboard.ts';
import { beltKey, drinkTitle, drinkView } from './belt.ts';
import { gateTag } from './conversation.ts';
import { drawIcon } from './icons.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';

const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M8 8V6.5a4 4 0 0 1 8 0V8"/><path d="M5 9.5h14l-1.2 10.5H6.2z"/><path d="M9.5 13.5h5"/></svg>`;

/** The big icon of the chosen item, in the detail: 16 x 16 at 3x. */
const DETAIL_SCALE = 3;
/** The pack button shines this long when something comes into the pack (ms). */
const GAIN_MS = 700;
/** A press on a slot becomes a drag when the pointer moves this far (CSS pixels). */
const DRAG_START = 6;

/** What the player can do from the panel. */
export interface PackActions {
  /** Drink (or chew) one item of this kind. */
  readonly drink: (kind: ItemKind) => void;
  /**
   * Put `count` items of slot `slot` (of `kind`) on the ground: in front of the player, or, with
   * `at` (a point of the screen, in CSS pixels), tossed towards the point where the player dragged them.
   */
  readonly drop: (slot: number, kind: ItemKind, count: number, at?: { readonly x: number; readonly y: number }) => void;
  /** Move the stack of slot `from` onto slot `to`. */
  readonly move: (from: number, to: number) => void;
}

/** A stack that the player drags from its slot. */
interface Drag {
  readonly pointer: number;
  readonly from: number;
  readonly kind: ItemKind;
  readonly startX: number;
  readonly startY: number;
  /** The icon under the pointer; null until the pointer moves DRAG_START from where it pressed. */
  ghost: HTMLElement | null;
  /** The slot under the pointer, or null. */
  over: number | null;
  /** Whether the pointer is over the world, and where it is (CSS pixels). */
  world: boolean;
  x: number;
  y: number;
}

/**
 * The pack: a button in the top-right corner (left of the settings), or I on a keyboard, opens a
 * panel with the coins and the slots of the pack (Strength gives the slots), each stack in its own
 * slot. A press on a slot chooses it, and the detail under the slots says what it is, what it does
 * and what it is for (the world's line), with its actions: "Drink" (or "Chew", by the gate rule),
 * "Drop one" and "Drop all". The player drags a stack (a mouse or a finger) onto another slot to
 * move it there (moveInPack), or out of the panel onto the world to toss it there (tossPoint). A
 * dropped stack lies on the ground until someone picks it up (piles.ts). The button shows a mark
 * when every slot is in use, and it shines when something comes into the pack.
 */
export class PackPanel {
  private readonly art: Art;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly slotsLabel: HTMLElement;
  private readonly coins: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly actions: PackActions;
  private readonly scores: Scores;
  private readonly lines: Readonly<Partial<Record<ItemKind, string>>>;
  private shown = '';
  /** The slots of the pack, in order: a stack, or null for a free slot. */
  private stacks: PackSlot[] = [];
  private slots = 0;
  /** The stack that the player drags now, or null. */
  private drag: Drag | null = null;
  /** The click that ends a drag does not choose the slot. */
  private dragged = false;
  /** The pack changed during a press: draw the slots again when it ends. */
  private stale = false;
  /** The chosen slot (in the order of the panel), and its kind, so the choice follows its stack. */
  private chosen: { index: number; kind: ItemKind } | null = null;
  /** How many items the pack held at the last show, to see a gain; null before the first. */
  private carried: number | null = null;
  private gainTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * `note`: a line under the slots (a guest's pack, or one that is not saved), or null. `scores`:
   * the character's, for a drink behind a gate (herbs: Medicine). `lines`: the world's line about
   * each kind of item (WorldDefinition.items).
   */
  constructor(
    art: Art,
    note: string | null,
    actions: PackActions,
    scores: Scores = PLAIN_SCORES,
    lines: Readonly<Partial<Record<ItemKind, string>>> = {},
  ) {
    this.art = art;
    this.actions = actions;
    this.scores = scores;
    this.lines = lines;
    const text = STRINGS.pack;
    this.button = document.createElement('button');
    this.button.id = 'pack-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', text.button);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'pack');
    this.button.setAttribute('aria-keyshortcuts', 'I');
    this.button.title = text.buttonKey;
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'pack';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', text.heading);
    const head = document.createElement('div');
    head.className = 'pack-head';
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = text.heading;
    this.slotsLabel = document.createElement('span');
    this.slotsLabel.className = 'pack-count';
    head.append(title, this.slotsLabel);

    const purse = document.createElement('div');
    purse.className = 'pack-coins';
    const coinIcon = document.createElement('canvas');
    coinIcon.setAttribute('aria-hidden', 'true');
    drawIcon(coinIcon, art.frame('item/coin'));
    const coinName = document.createElement('span');
    coinName.textContent = text.coins;
    this.coins = document.createElement('span');
    this.coins.className = 'pack-coin-count';
    purse.append(coinIcon, coinName, this.coins);

    this.grid = document.createElement('ul');
    this.grid.className = 'pack-slots';
    this.detail = document.createElement('div');
    this.detail.className = 'pack-detail';
    this.detail.setAttribute('aria-live', 'polite');
    this.empty = document.createElement('p');
    this.empty.className = 'menu-hint';
    this.empty.textContent = text.empty;
    this.panel.append(head, purse, this.grid, this.detail, this.empty);
    if (note) {
      const line = document.createElement('p');
      line.className = 'menu-hint';
      line.textContent = note;
      this.panel.append(line);
    }

    this.button.addEventListener('click', () => this.open(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      // Esc ends a drag first, then it closes the panel.
      if (event.code === 'Escape' && this.drag) {
        this.endDrag(false);
        return;
      }
      if (event.code === 'Escape') this.open(false);
      // I opens and closes it. KeyboardEvent.code, as the other keys: the same key on any layout.
      if (event.code !== 'KeyI' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault();
      this.open(this.panel.hidden !== false);
    });
    onOtherPanelOpen('pack', () => this.open(false));
    // Give the focus back after a click, so WASD moves the player again at once.
    this.panel.addEventListener('click', () => setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0));
    document.body.append(this.button, this.panel);
  }

  /** Whether the player drags a stack now. */
  get dragging(): boolean {
    return this.drag?.ghost != null;
  }

  /** Shows a pack with `slots` slots. */
  show(pack: Pack, slots: number): void {
    const key = JSON.stringify([pack, slots]);
    if (key === this.shown) return;
    this.shown = key;
    const carried = pack.coins + pack.items.reduce((n, s) => n + (s?.count ?? 0), 0);
    if (this.carried !== null && carried > this.carried) this.shine();
    this.carried = carried;
    this.stacks = [...pack.items];
    this.slots = slots;
    // The choice follows its stack: the same slot if it still holds that kind, else the first slot of the kind.
    if (this.chosen && this.stacks[this.chosen.index]?.kind !== this.chosen.kind) {
      const index = this.stacks.findIndex((s) => s?.kind === this.chosen!.kind);
      this.chosen = index >= 0 ? { index, kind: this.chosen.kind } : null;
    }
    const used = usedSlots(pack);
    const full = used >= slots;
    this.button.classList.toggle('full', full);
    this.button.setAttribute('aria-label', full ? STRINGS.pack.buttonFull : STRINGS.pack.button);
    this.slotsLabel.textContent = STRINGS.pack.slots(used, slots);
    this.coins.textContent = String(pack.coins);
    this.empty.hidden = used > 0 || pack.coins > 0;
    // Not during a press or a drag: the slots under the pointer stay as they are until it ends.
    if (this.drag) this.stale = true;
    else this.render();
  }

  private render(): void {
    this.stale = false;
    this.grid.replaceChildren();
    for (let i = 0; i < Math.max(this.slots, this.stacks.length); i++) {
      const stack = this.stacks[i];
      const slot = document.createElement('li');
      slot.className = stack ? 'pack-slot' : 'pack-slot pack-slot-free';
      slot.dataset.slot = String(i);
      if (stack) {
        const names = STRINGS.items[stack.kind];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pack-pick';
        button.title = STRINGS.pack.stack(stack.count, names);
        button.setAttribute('aria-label', button.title);
        button.setAttribute('aria-pressed', String(this.chosen?.index === i));
        if (this.chosen?.index === i) slot.classList.add('chosen');
        const icon = document.createElement('canvas');
        icon.setAttribute('aria-hidden', 'true');
        drawIcon(icon, this.art.frame(`item/${stack.kind}`));
        const count = document.createElement('span');
        count.className = 'pack-stack';
        count.textContent = stack.count > 1 ? String(stack.count) : '';
        button.append(icon, count);
        // A use behind a gate, 1 or 2 short of it (herbs without Medicine): the gate, dim, in a corner.
        const gate = DRINKS[stack.kind]?.gate;
        if (gate && drinkView(stack.kind, this.scores) === 'hint') {
          const tag = document.createElement('span');
          tag.className = 'pack-gate';
          tag.textContent = gateTag(gate).replace(/^\[|\]$/g, '');
          button.append(tag);
        }
        button.addEventListener('click', () => {
          if (this.dragged) return;
          this.chosen = { index: i, kind: stack.kind };
          this.render();
        });
        button.addEventListener('pointerdown', (event) => this.press(event, i, stack.kind));
        slot.append(button);
      }
      this.grid.append(slot);
    }
    this.renderDetail();
  }

  /** The detail of the chosen slot: what it is, what it does, the world's line, and its actions. */
  private renderDetail(): void {
    this.detail.replaceChildren();
    const stack = this.chosen ? this.stacks[this.chosen.index] : undefined;
    if (!stack) {
      this.detail.hidden = this.stacks.length === 0;
      const hint = document.createElement('p');
      hint.className = 'menu-hint';
      hint.textContent = STRINGS.pack.choose;
      this.detail.append(hint);
      return;
    }
    this.detail.hidden = false;
    const names = STRINGS.items[stack.kind];
    const top = document.createElement('div');
    top.className = 'pack-detail-top';
    const icon = document.createElement('canvas');
    icon.className = 'pack-detail-icon';
    icon.setAttribute('aria-hidden', 'true');
    drawIcon(icon, this.art.frame(`item/${stack.kind}`), DETAIL_SCALE);
    const words = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'pack-detail-name';
    name.textContent = names.name;
    if (stack.count > 1) {
      const count = document.createElement('span');
      count.className = 'pack-detail-count';
      count.textContent = ` ${STRINGS.pack.count(stack.count)}`;
      name.append(count);
    }
    words.append(name);
    const drink = DRINKS[stack.kind];
    const view = drinkView(stack.kind, this.scores);
    if (drink && view === 'open') words.append(this.line('pack-detail-use', STRINGS.pack.effect(drink.gate !== undefined, effectParts(drink))));
    else if (drink?.gate && view === 'hint') words.append(this.line('pack-detail-use dim', `${gateTag(drink.gate)} ${STRINGS.pack.chewHint(names.a)}`));
    const about = this.lines[stack.kind];
    if (about) words.append(this.line('pack-detail-about', about));
    words.append(this.line('pack-detail-stack', STRINGS.pack.stackOf(ITEM_STACK[stack.kind])));
    top.append(icon, words);

    const buttons = document.createElement('div');
    buttons.className = 'pack-actions';
    if (drink && view === 'open') {
      const use = this.action(drink.gate ? STRINGS.pack.chewButton : STRINGS.pack.drinkButton, drinkTitle(stack.kind), () => this.actions.drink(stack.kind));
      use.classList.add('main');
      const key = document.createElement('span');
      key.className = 'pack-key';
      key.textContent = String(beltKey(stack.kind));
      use.append(key);
      buttons.append(use);
    }
    const slot = this.chosen!.index;
    if (stack.count > 1) buttons.append(this.action(STRINGS.pack.dropOne, STRINGS.pack.dropWhat(names.a), () => this.actions.drop(slot, stack.kind, 1)));
    const all = STRINGS.pack.stack(stack.count, names);
    buttons.append(this.action(stack.count > 1 ? STRINGS.pack.dropAll : STRINGS.pack.drop, STRINGS.pack.dropWhat(all), () => this.actions.drop(slot, stack.kind, stack.count)));
    this.detail.append(top, buttons);
  }

  private line(className: string, text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    return p;
  }

  private action(label: string, title: string, run: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pack-action';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.addEventListener('click', run);
    return button;
  }

  /**
   * A press on a used slot (the main button of a mouse, a finger or a pen): it becomes a drag when
   * the pointer moves DRAG_START, and else it is a click, which chooses the slot.
   */
  private press(event: PointerEvent, from: number, kind: ItemKind): void {
    if (this.drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.dragged = false;
    this.drag = { pointer: event.pointerId, from, kind, startX: event.clientX, startY: event.clientY, ghost: null, over: null, world: false, x: event.clientX, y: event.clientY };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
  }

  private readonly onMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_START) return;
      drag.ghost = this.ghost(drag);
      this.slotElement(drag.from)?.classList.add('dragging');
      document.body.classList.add('pack-dragging');
    }
    event.preventDefault();
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.ghost.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    // What is under the pointer: a slot of the panel, the world (the game's surface), or other GUI.
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const slot = under?.closest<HTMLElement>('.pack-slot');
    const over = slot && this.grid.contains(slot) ? Number(slot.dataset.slot) : null;
    if (over !== drag.over) {
      if (drag.over !== null) this.slotElement(drag.over)?.classList.remove('drop-target');
      if (over !== null && over !== drag.from) this.slotElement(over)?.classList.add('drop-target');
      drag.over = over;
    }
    drag.world = !slot && under?.closest('#game') != null;
    drag.ghost.classList.toggle('to-ground', drag.world);
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (this.drag && event.pointerId === this.drag.pointer) this.endDrag(true);
  };

  private readonly onCancel = (event: PointerEvent): void => {
    if (this.drag && event.pointerId === this.drag.pointer) this.endDrag(false);
  };

  /**
   * Ends the drag. With `act`: onto another slot, the stack moves there; onto the world, the player
   * tosses the stack (all of it, as the slot holds it now) towards that point.
   */
  private endDrag(act: boolean): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    document.body.classList.remove('pack-dragging');
    if (!drag.ghost) {
      // A press that did not move: its click chooses the slot. The slots stay until the click comes.
      if (this.stale) {
        setTimeout(() => {
          if (!this.drag) this.render();
        }, 0);
      }
      return;
    }
    // The click that comes after this press does not choose the slot.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    drag.ghost.remove();
    const stack = this.stacks[drag.from];
    if (act && stack?.kind === drag.kind) {
      if (drag.over !== null && drag.over !== drag.from) {
        // The choice follows the stacks that moved (a stack of the same kind stays: it fills).
        if (this.chosen?.index === drag.from) this.chosen = { index: drag.over, kind: drag.kind };
        else if (this.chosen?.index === drag.over && this.chosen.kind !== drag.kind) this.chosen = { index: drag.from, kind: this.chosen.kind };
        this.actions.move(drag.from, drag.over);
      } else if (drag.world) {
        this.actions.drop(drag.from, drag.kind, stack.count, { x: drag.x, y: drag.y });
      }
    }
    this.render();
  }

  /** The icon of a dragged stack, under the pointer; it does not take the pointer's events. */
  private ghost(drag: Drag): HTMLElement {
    const stack = this.stacks[drag.from];
    const ghost = document.createElement('div');
    ghost.className = 'pack-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('canvas');
    drawIcon(icon, this.art.frame(`item/${drag.kind}`));
    ghost.append(icon);
    if (stack && stack.count > 1) {
      const count = document.createElement('span');
      count.className = 'pack-stack';
      count.textContent = String(stack.count);
      ghost.append(count);
    }
    document.body.append(ghost);
    return ghost;
  }

  private slotElement(index: number): HTMLElement | null {
    return this.grid.querySelector<HTMLElement>(`.pack-slot[data-slot="${index}"]`);
  }

  /** The button shines a moment: something came into the pack. */
  private shine(): void {
    this.button.classList.remove('gain');
    void this.button.offsetWidth;
    this.button.classList.add('gain');
    if (this.gainTimer) clearTimeout(this.gainTimer);
    this.gainTimer = setTimeout(() => this.button.classList.remove('gain'), GAIN_MS);
  }

  private open(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) announceOpenPanel('pack');
  }
}

/** What a drink does, in words: "2 hit points back", "all your hit points back", "a poison ends". */
function effectParts(drink: NonNullable<(typeof DRINKS)[ItemKind]>): string[] {
  const parts: string[] = [];
  if (drink.full) parts.push(STRINGS.pack.fullHp);
  else if (drink.hp) parts.push(STRINGS.pack.hp(drink.hp));
  if (drink.cure) parts.push(STRINGS.pack.cure);
  return parts;
}
