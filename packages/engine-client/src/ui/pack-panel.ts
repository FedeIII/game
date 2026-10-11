import {
  CASTER_FOCUS,
  DRINKS,
  EMPTY_GEAR,
  GEAR_SLOTS,
  GUEST_TRAITS,
  ITEM_STACK,
  WEARABLES,
  canUse,
  dieBase,
  fitsSlot,
  gearAddress,
  gearSlotAt,
  takeOffSlotFor,
  usedSlots,
  wearProblem,
  wearSlotFor,
  type Gear,
  type ItemKind,
  type Pack,
  type PackSlot,
  type PlayerTraits,
} from '@game/engine';
import { SKIN_PORTRAIT } from '../../art/skins.ts';
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
/**
 * The picture of the character among the worn slots: at 3x, the rows of the portrait from
 * PORTRAIT_TOP down, so that it fits two rows of slots (a staff over the head can be cut).
 */
const PORTRAIT_SCALE = 3;
const PORTRAIT_TOP = 13;
const PORTRAIT_ROWS = 31;
/** The pack button shines this long when something comes into the pack (ms). */
const GAIN_MS = 700;
/** A press on a slot becomes a drag when the pointer moves this far (CSS pixels). */
const DRAG_START = 6;

/** What the player can do from the panel. A place is an address: a slot of the pack, or a worn slot (gear.ts, gearAddress). */
export interface PackActions {
  /** Drink (or chew) one item of this kind. */
  readonly drink: (kind: ItemKind) => void;
  /**
   * Put `count` items of place `slot` (of `kind`) on the ground: in front of the player, or, with
   * `at` (a point of the screen, in CSS pixels), tossed towards the point where the player dragged them.
   */
  readonly drop: (slot: number, kind: ItemKind, count: number, at?: { readonly x: number; readonly y: number }) => void;
  /** Move the item of place `from` onto place `to`: a stack in the pack, or an item to put on or to take off. */
  readonly move: (from: number, to: number) => void;
}

/** An item that the player drags from its place. */
interface Drag {
  readonly pointer: number;
  readonly from: number;
  readonly kind: ItemKind;
  readonly startX: number;
  readonly startY: number;
  /** The icon under the pointer; null until the pointer moves DRAG_START from where it pressed. */
  ghost: HTMLElement | null;
  /** The place under the pointer, or null. */
  over: number | null;
  /** Whether the pointer is over the world, and where it is (CSS pixels). */
  world: boolean;
  x: number;
  y: number;
}

/**
 * The pack: a button in the top-right corner (left of the settings), or I on a keyboard, opens a
 * panel with what the character wears (the twelve slots of D&D 5e round its picture, with its
 * Armour Class and its damage), the coins, and the slots of the pack (Strength gives the slots),
 * each stack in its own slot. A press on a slot chooses it, and the detail under the slots says
 * what it is, what it does and what it is for (the world's line), with its actions: "Wear" or
 * "Take off", "Drink" (or "Chew", by the gate rule), "Drop one" and "Drop all". The player drags an
 * item (a mouse or a finger) onto another slot: in the pack it moves there (moveInPack); onto a
 * worn slot the character puts it on, and from a worn slot it takes it off (moveItem). A drag out
 * of the panel onto the world tosses it there (tossPoint): it lies on the ground until someone
 * picks it up (piles.ts). The button shows a mark when every slot is in use, and it shines when
 * something comes into the pack.
 */
export class PackPanel {
  private readonly art: Art;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly slotsLabel: HTMLElement;
  private readonly coins: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly worn: HTMLElement;
  private readonly portrait: HTMLCanvasElement;
  private readonly stats: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly actions: PackActions;
  private readonly lines: Readonly<Partial<Record<ItemKind, string>>>;
  private shown = '';
  /** The slots of the pack, in order: a stack, or null for a free slot. */
  private stacks: PackSlot[] = [];
  private pack: Pack = { coins: 0, items: [] };
  private gear: Gear = EMPTY_GEAR;
  private traits: PlayerTraits = GUEST_TRAITS;
  /** The item that the player drags now, or null. */
  private drag: Drag | null = null;
  /** The click that ends a drag does not choose the slot. */
  private dragged = false;
  /** The pack changed during a press: draw the slots again when it ends. */
  private stale = false;
  /** The chosen place (an address), and its kind, so the choice follows its item. */
  private chosen: { index: number; kind: ItemKind } | null = null;
  /** How many items the pack held at the last show, to see a gain; null before the first. */
  private carried: number | null = null;
  private gainTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * `note`: a line under the slots (a guest's pack, or one that is not saved), or null. `lines`:
   * the world's line about each kind of item (WorldDefinition.items).
   */
  constructor(art: Art, note: string | null, actions: PackActions, lines: Readonly<Partial<Record<ItemKind, string>>> = {}) {
    this.art = art;
    this.actions = actions;
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

    // What the character wears: the slots round its picture, and its Armour Class and damage beside it.
    const wornHeading = document.createElement('p');
    wornHeading.className = 'settings-heading';
    wornHeading.textContent = STRINGS.gear.heading;
    this.worn = document.createElement('ul');
    this.worn.className = 'gear-slots';
    this.worn.setAttribute('aria-label', STRINGS.gear.heading);
    const figure = document.createElement('li');
    figure.className = 'gear-figure';
    figure.setAttribute('aria-hidden', 'true');
    this.portrait = document.createElement('canvas');
    this.portrait.className = 'gear-portrait';
    this.portrait.width = SKIN_PORTRAIT.width * PORTRAIT_SCALE;
    this.portrait.height = PORTRAIT_ROWS * PORTRAIT_SCALE;
    figure.append(this.portrait);
    this.worn.append(figure);
    this.stats = document.createElement('div');
    this.stats.className = 'gear-stats';

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
    this.panel.append(head, wornHeading, this.worn, this.stats, purse, this.grid, this.detail, this.empty);
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

  /** Whether the player drags an item now. */
  get dragging(): boolean {
    return this.drag?.ghost != null;
  }

  /** Shows the picture of the character among the worn slots: the standing frame of its sheet. */
  showLook(sheet: HTMLCanvasElement | null): void {
    const context = this.portrait.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, this.portrait.width, this.portrait.height);
    const { x, y, width } = SKIN_PORTRAIT;
    if (sheet) context.drawImage(sheet, x, y + PORTRAIT_TOP, width, PORTRAIT_ROWS, 0, 0, this.portrait.width, this.portrait.height);
  }

  /** Shows a pack, what the character wears, and what it gives (`traits`: the slots of the pack, the class, the Armour Class). */
  show(pack: Pack, gear: Gear, traits: PlayerTraits): void {
    const slots = traits.slots;
    const key = JSON.stringify([pack, gear, slots, traits.class, traits.ac, traits.glance, traits.damage, traits.scores]);
    if (key === this.shown) return;
    this.shown = key;
    const carried = pack.coins + pack.items.reduce((n, s) => n + (s?.count ?? 0), 0);
    if (this.carried !== null && carried > this.carried) this.shine();
    this.carried = carried;
    this.stacks = [...pack.items];
    this.pack = pack;
    this.gear = gear;
    this.traits = traits;
    // The choice follows its item: the same place if it still holds that kind, else the worn slot or the first slot of the kind.
    if (this.chosen && this.kindAt(this.chosen.index) !== this.chosen.kind) {
      const kind = this.chosen.kind;
      const worn = GEAR_SLOTS.find((slot) => gear[slot] === kind);
      const index = worn ? gearAddress(worn) : this.stacks.findIndex((s) => s?.kind === kind);
      this.chosen = index >= 0 ? { index, kind } : null;
    }
    const used = usedSlots(pack);
    const full = used >= slots;
    this.button.classList.toggle('full', full);
    this.button.setAttribute('aria-label', full ? STRINGS.pack.buttonFull : STRINGS.pack.button);
    this.slotsLabel.textContent = STRINGS.pack.slots(used, slots);
    this.coins.textContent = String(pack.coins);
    this.empty.hidden = used > 0 || pack.coins > 0;
    const g = STRINGS.gear;
    const numbers = this.line('gear-numbers', `${g.ac(traits.ac)} · ${g.damage(traits.damage)}`);
    this.stats.replaceChildren(numbers, this.line('gear-glance', g.glance(traits.glance)));
    // Not during a press or a drag: the slots under the pointer stay as they are until it ends.
    if (this.drag) this.stale = true;
    else this.render();
  }

  /** The kind of item at a place (a slot of the pack or a worn slot), or null. */
  private kindAt(index: number): ItemKind | null {
    const worn = gearSlotAt(index);
    return worn !== null ? this.gear[worn] : (this.stacks[index]?.kind ?? null);
  }

  /** How many items a place holds. */
  private countAt(index: number): number {
    return gearSlotAt(index) !== null ? (this.kindAt(index) === null ? 0 : 1) : (this.stacks[index]?.count ?? 0);
  }

  private render(): void {
    this.stale = false;
    this.grid.replaceChildren();
    for (let i = 0; i < Math.max(this.traits.slots, this.stacks.length); i++) {
      const stack = this.stacks[i];
      const slot = document.createElement('li');
      slot.className = stack ? 'pack-slot' : 'pack-slot pack-slot-free';
      slot.dataset.slot = String(i);
      if (stack) slot.append(this.pick(i, stack.kind, stack.count, STRINGS.pack.stack(stack.count, STRINGS.items[stack.kind])));
      if (stack && this.chosen?.index === i) slot.classList.add('chosen');
      this.grid.append(slot);
    }
    // The worn slots after the picture (the first child of the list).
    while (this.worn.children.length > 1) this.worn.lastElementChild!.remove();
    for (const name of GEAR_SLOTS) {
      const kind = this.gear[name];
      const index = gearAddress(name);
      const slot = document.createElement('li');
      slot.className = kind ? 'pack-slot gear-slot' : 'pack-slot pack-slot-free gear-slot';
      slot.dataset.slot = String(index);
      slot.dataset.gear = name;
      slot.style.gridArea = name;
      const where = STRINGS.gear.slots[name];
      if (kind) {
        slot.append(this.pick(index, kind, 1, STRINGS.gear.worn(where, STRINGS.items[kind].a)));
        if (this.chosen?.index === index) slot.classList.add('chosen');
      } else {
        slot.title = STRINGS.gear.empty(where);
        slot.setAttribute('aria-label', slot.title);
        const label = document.createElement('span');
        label.className = 'gear-label';
        label.setAttribute('aria-hidden', 'true');
        label.textContent = STRINGS.gear.short[name];
        slot.append(label);
      }
      this.worn.append(slot);
    }
    this.renderDetail();
  }

  /** The button of a used place: a press chooses it, a drag moves it. */
  private pick(index: number, kind: ItemKind, count: number, title: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pack-pick';
    button.title = title;
    button.setAttribute('aria-label', title);
    button.setAttribute('aria-pressed', String(this.chosen?.index === index));
    const icon = document.createElement('canvas');
    icon.setAttribute('aria-hidden', 'true');
    drawIcon(icon, this.art.frame(`item/${kind}`));
    const number = document.createElement('span');
    number.className = 'pack-stack';
    number.textContent = count > 1 ? String(count) : '';
    button.append(icon, number);
    // A use behind a gate, 1 or 2 short of it (herbs without Medicine): the gate, dim, in a corner.
    const gate = DRINKS[kind]?.gate;
    if (gate && drinkView(kind, this.traits.scores) === 'hint') {
      const tag = document.createElement('span');
      tag.className = 'pack-gate';
      tag.textContent = gateTag(gate).replace(/^\[|\]$/g, '');
      button.append(tag);
    }
    // An item that the class cannot use shows dim.
    if (WEARABLES[kind] && !canUse(this.traits.class, kind)) button.classList.add('gear-unusable');
    button.addEventListener('click', () => {
      if (this.dragged) return;
      this.chosen = { index, kind };
      this.render();
    });
    button.addEventListener('pointerdown', (event) => this.press(event, index, kind));
    return button;
  }

  /** The detail of the chosen place: what it is, what it does, the world's line, and its actions. */
  private renderDetail(): void {
    this.detail.replaceChildren();
    const index = this.chosen?.index ?? -1;
    const kind = this.chosen ? this.kindAt(index) : null;
    if (!kind) {
      this.detail.hidden = this.stacks.length === 0 && GEAR_SLOTS.every((slot) => this.gear[slot] === null);
      const hint = document.createElement('p');
      hint.className = 'menu-hint';
      hint.textContent = STRINGS.pack.choose;
      this.detail.append(hint);
      return;
    }
    this.detail.hidden = false;
    const count = this.countAt(index);
    const wornIn = gearSlotAt(index);
    const names = STRINGS.items[kind];
    const top = document.createElement('div');
    top.className = 'pack-detail-top';
    const icon = document.createElement('canvas');
    icon.className = 'pack-detail-icon';
    icon.setAttribute('aria-hidden', 'true');
    drawIcon(icon, this.art.frame(`item/${kind}`), DETAIL_SCALE);
    const words = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'pack-detail-name';
    name.textContent = names.name;
    if (count > 1) {
      const number = document.createElement('span');
      number.className = 'pack-detail-count';
      number.textContent = ` ${STRINGS.pack.count(count)}`;
      name.append(number);
    }
    words.append(name);
    if (wornIn) words.append(this.line('pack-detail-use', STRINGS.gear.wornIn(STRINGS.gear.slots[wornIn])));
    for (const line of wearLines(kind, this.traits)) words.append(this.line('pack-detail-use', line));
    const drink = DRINKS[kind];
    const view = drinkView(kind, this.traits.scores);
    if (drink && view === 'open') words.append(this.line('pack-detail-use', STRINGS.pack.effect(drink.gate !== undefined, effectParts(drink))));
    else if (drink?.gate && view === 'hint') words.append(this.line('pack-detail-use dim', `${gateTag(drink.gate)} ${STRINGS.pack.chewHint(names.a)}`));
    // Why the character cannot put it on.
    const target = WEARABLES[kind] && !wornIn ? wearSlotFor(this.gear, kind) : null;
    const problem = target ? wearProblem(this.gear, kind, target, this.traits.class) : null;
    if (problem === 'class') words.append(this.line('pack-detail-use dim', STRINGS.gear.cannot(STRINGS.classes[this.traits.class].name)));
    if (problem === 'attuned') words.append(this.line('pack-detail-use dim', STRINGS.gear.attuned));
    const about = this.lines[kind];
    if (about) words.append(this.line('pack-detail-about', about));
    if (!wornIn) words.append(this.line('pack-detail-stack', STRINGS.pack.stackOf(ITEM_STACK[kind])));
    top.append(icon, words);

    const buttons = document.createElement('div');
    buttons.className = 'pack-actions';
    if (target && !problem) {
      const put = this.action(STRINGS.gear.wear, STRINGS.gear.wearWhat(names.a), () => this.actions.move(index, gearAddress(target)));
      put.classList.add('main');
      buttons.append(put);
    }
    if (wornIn) {
      const to = takeOffSlotFor(this.pack, kind, this.traits.slots);
      const off = this.action(STRINGS.gear.takeOff, to === null ? STRINGS.gear.full : STRINGS.gear.takeOffWhat(names.a), () => {
        if (to !== null) this.actions.move(index, to);
      });
      off.classList.add('main');
      off.disabled = to === null;
      buttons.append(off);
    }
    if (drink && view === 'open') {
      const use = this.action(drink.gate ? STRINGS.pack.chewButton : STRINGS.pack.drinkButton, drinkTitle(kind), () => this.actions.drink(kind));
      use.classList.add('main');
      const key = document.createElement('span');
      key.className = 'pack-key';
      key.textContent = String(beltKey(kind));
      use.append(key);
      buttons.append(use);
    }
    if (count > 1) buttons.append(this.action(STRINGS.pack.dropOne, STRINGS.pack.dropWhat(names.a), () => this.actions.drop(index, kind, 1)));
    const all = STRINGS.pack.stack(count, names);
    buttons.append(this.action(count > 1 ? STRINGS.pack.dropAll : STRINGS.pack.drop, STRINGS.pack.dropWhat(all), () => this.actions.drop(index, kind, count)));
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

  /** Whether the dragged item can go onto place `to`: any slot of the pack; a worn slot that fits it, for a class that can use it. */
  private accepts(drag: Drag, to: number): boolean {
    if (to === drag.from) return false;
    const worn = gearSlotAt(to);
    if (worn === null) return true;
    return fitsSlot(drag.kind, worn) && canUse(this.traits.class, drag.kind);
  }

  /**
   * A press on a used place (the main button of a mouse, a finger or a pen): it becomes a drag when
   * the pointer moves DRAG_START, and else it is a click, which chooses the place.
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
    const over = slot && this.panel.contains(slot) ? Number(slot.dataset.slot) : null;
    if (over !== drag.over) {
      if (drag.over !== null) this.slotElement(drag.over)?.classList.remove('drop-target');
      if (over !== null && this.accepts(drag, over)) this.slotElement(over)?.classList.add('drop-target');
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
   * Ends the drag. With `act`: onto another place, the item moves there (the character puts it on
   * or takes it off); onto the world, the player tosses it (all of the stack, as the slot holds it
   * now) towards that point.
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
      // A press that did not move: its click chooses the place. The slots stay until the click comes.
      if (this.stale) {
        setTimeout(() => {
          if (!this.drag) this.render();
        }, 0);
      }
      return;
    }
    // The click that comes after this press does not choose the place.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    drag.ghost.remove();
    if (act && this.kindAt(drag.from) === drag.kind) {
      if (drag.over !== null && this.accepts(drag, drag.over)) {
        // The choice follows the stacks that moved in the pack (a stack of the same kind stays: it
        // fills); for a worn slot, show() finds the item where it went.
        const toKind = this.kindAt(drag.over);
        if (this.chosen?.index === drag.from) this.chosen = { index: drag.over, kind: drag.kind };
        else if (this.chosen?.index === drag.over && toKind !== null && toKind !== drag.kind) this.chosen = { index: drag.from, kind: toKind };
        this.actions.move(drag.from, drag.over);
      } else if (drag.over === null && drag.world) {
        this.actions.drop(drag.from, drag.kind, this.countAt(drag.from), { x: drag.x, y: drag.y });
      }
    }
    this.render();
  }

  /** The icon of a dragged item, under the pointer; it does not take the pointer's events. */
  private ghost(drag: Drag): HTMLElement {
    const count = this.countAt(drag.from);
    const ghost = document.createElement('div');
    ghost.className = 'pack-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const icon = document.createElement('canvas');
    drawIcon(icon, this.art.frame(`item/${drag.kind}`));
    ghost.append(icon);
    if (count > 1) {
      const number = document.createElement('span');
      number.className = 'pack-stack';
      number.textContent = String(count);
      ghost.append(number);
    }
    document.body.append(ghost);
    return ghost;
  }

  private slotElement(index: number): HTMLElement | null {
    return this.panel.querySelector<HTMLElement>(`.pack-slot[data-slot="${index}"]`);
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

/** What an item to wear does, in words (gear.ts): its armour, its weapon, its luck. */
export function wearLines(kind: ItemKind, traits: Pick<PlayerTraits, 'class'>): string[] {
  const item = WEARABLES[kind];
  if (!item) return [];
  const g = STRINGS.gear;
  const lines: string[] = [];
  if (item.place === 'ring') lines.push(g.ring);
  if (item.armour) {
    lines.push(g.armour(item.armour.type, item.armour.ac));
    if (item.armour.str !== undefined) lines.push(g.heavy(item.armour.str));
    if (item.armour.noisy) lines.push(g.noisy);
  }
  if (item.shield) lines.push(g.shield(item.shield));
  const weapon = item.weapon;
  if (weapon) {
    lines.push(g.weapon(weapon.die, dieBase(weapon.die)));
    if (weapon.versatile !== undefined) lines.push(g.versatile(weapon.versatile, dieBase(weapon.versatile)));
    if (weapon.twoHanded) lines.push(g.twoHanded);
    if (weapon.light) lines.push(g.light);
    if (weapon.heavy && !weapon.ranged) lines.push(g.heavyWeapon);
    if (weapon.ranged) lines.push(g.ranged);
    if (weapon.focus && CASTER_FOCUS[traits.class] === weapon.focus) lines.push(g.focus);
  }
  if (item.luck) lines.push(g.luck(item.luck));
  if (item.attune) lines.push(g.attune);
  return lines;
}
