import type { Texture } from 'pixi.js';
import {
  DRINKS,
  GEAR_SLOTS,
  WEARABLES,
  canMakeDeal,
  canUse,
  dealPay,
  dealPrice,
  gateView,
  holds,
  shopWares,
  usedSlots,
  wareDeal,
  type Deal,
  type Gear,
  type ItemKind,
  type Pack,
  type PlayerTraits,
  type QuestBook,
  type Shop,
  type ShopSide,
  type Ware,
} from '@game/engine';
import type { Art } from '../assets.ts';
import { countOf, drinkView } from './belt.ts';
import { drawCloseup, gateTag } from './conversation.ts';
import { drawIcon } from './icons.ts';
import { effectParts, wearLines } from './pack-panel.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';
import { tw } from '../i18n.ts';

/** Why a trade cannot go now: a gate, too few coins, no room in the pack, none to sell, or the item is worn. */
export type TradeProblem = 'gate' | 'coins' | 'room' | 'none' | 'worn';

/** A ware of a shop as the panel shows it to a character. */
export interface WareRow {
  readonly ware: Ware;
  readonly side: ShopSide;
  readonly deal: Deal;
  /** The coins that the player pays (a purchase) or gets (a sale), after Charisma. */
  readonly coins: number;
  /** How many the player has in its pack. */
  readonly have: number;
  /** Why the trade cannot go now, or null. */
  readonly problem: TradeProblem | null;
}

/** What the rows of a shop read: the character, now. */
export interface TraderFacts {
  readonly pack: Pack;
  readonly gear: Gear;
  readonly book: QuestBook;
  readonly traits: PlayerTraits;
}

/**
 * The rows of one side of a shop for a character: the wares that it sees, each with its price after
 * Charisma and what stops the trade. A ware behind a gate shows only open or as a dim clue (gateView,
 * the problem 'gate'); a ware with conditions only when they hold (as the server checks them, on the
 * pack). On the side to sell, the wares that the player has come first.
 */
export function wareRows(shop: Shop, side: ShopSide, facts: TraderFacts): WareRow[] {
  const { pack, gear, book, traits } = facts;
  const rows: WareRow[] = [];
  for (const ware of shopWares(shop, side)) {
    const view = ware.gate ? gateView(traits.scores, ware.gate) : 'open';
    if (view === 'hidden' || !holds(ware.when, book, pack)) continue;
    const deal = wareDeal(ware, side);
    const have = countOf(pack, ware.kind);
    const coins = side === 'buy' ? dealPrice(deal, traits) : dealPay(deal, traits);
    let problem: TradeProblem | null = null;
    if (view === 'hint') problem = 'gate';
    else if (side === 'sell' && have === 0) problem = GEAR_SLOTS.some((slot) => gear[slot] === ware.kind) ? 'worn' : 'none';
    else if (side === 'buy' && pack.coins < coins) problem = 'coins';
    else if (!canMakeDeal(deal, pack, traits)) problem = 'room';
    rows.push({ ware, side, deal, coins, have, problem });
  }
  if (side === 'sell') rows.sort((a, b) => Number(b.have > 0) - Number(a.have > 0));
  return rows;
}

/** The icon of a ware in its row: 16 x 16 at 2x. */
const ROW_SCALE = 2;
/** The big icon of the chosen ware, in the detail: 16 x 16 at 3x. */
const DETAIL_SCALE = 3;

/** What the panel tells the game. */
export interface ShopEvents {
  /** The player makes the trade of a row: the game makes the deal (or sends it), and says whether it went. */
  readonly trade: (row: WareRow) => boolean;
  /** The panel closed (the close button, Esc, or another panel): the conversation shows again. */
  readonly close: () => void;
  /** The trader says a line after a trade (the game shows it over its head too). */
  readonly line?: (say: string) => void;
  /** A sound for the player's hand: a ware chosen, or a selection moved with the keys. */
  readonly sound?: (what: 'choose' | 'select') => void;
}

/** The trader of an open shop: its name, its close-up, and what it says now. */
export interface Trader {
  readonly name: string;
  readonly face: Texture | null;
  readonly say: string;
}

/**
 * The shop of a trader (Fede's request, 2026-10-13): an answer of a conversation opens it
 * (DialogAnswer.shop), in the place of the top-right panels, and the conversation shows again when
 * it closes. At the top, the close-up of the trader, its name and what it says; under it a side to
 * buy and a side to sell (only the sides that the shop has), the coins, the wares with their prices
 * for this character (Charisma), the detail of the chosen ware with its trade ("Buy" or "Sell", one
 * item at a time), and the pack. While it is open it takes the keys (the capture phase): W S or the
 * arrows choose a ware, A D or the arrows change the side, E, Enter or Space make the trade, Esc
 * closes it.
 */
export class ShopPanel {
  private readonly art: Art;
  private readonly events: ShopEvents;
  private readonly lines: Readonly<Partial<Record<ItemKind, string>>>;
  private readonly panel: HTMLElement;
  private readonly portrait: HTMLCanvasElement;
  private readonly name: HTMLElement;
  private readonly said: HTMLElement;
  private readonly tabs: HTMLElement;
  private readonly coins: HTMLElement;
  private readonly list: HTMLUListElement;
  private readonly empty: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly slotsLabel: HTMLElement;
  private readonly grid: HTMLUListElement;
  private shop: Shop | null = null;
  private side: ShopSide = 'buy';
  private facts: () => TraderFacts = () => {
    throw new Error('no shop');
  };
  private rows: WareRow[] = [];
  /** The id of the chosen ware: the choice follows it when the rows change. */
  private chosen: string | null = null;
  private shown = '';

  /** `lines`: the world's line about each kind of item (WorldDefinition.items). */
  constructor(art: Art, events: ShopEvents, lines: Readonly<Partial<Record<ItemKind, string>>> = {}) {
    this.art = art;
    this.events = events;
    this.lines = lines;
    const text = STRINGS.shop;
    this.panel = document.createElement('section');
    this.panel.id = 'shop';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-labelledby', 'shop-name');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'conversation-close';
    close.setAttribute('aria-label', text.back);
    close.title = text.back;
    close.textContent = '×';
    close.addEventListener('click', () => this.leave());

    this.portrait = document.createElement('canvas');
    this.portrait.className = 'portrait shop-portrait';
    this.portrait.setAttribute('aria-hidden', 'true');
    this.name = document.createElement('p');
    this.name.className = 'conversation-name';
    this.name.id = 'shop-name';
    this.said = document.createElement('p');
    this.said.className = 'shop-say';
    this.said.setAttribute('aria-live', 'polite');
    const words = document.createElement('div');
    words.className = 'shop-words';
    words.append(this.name, this.said);
    const head = document.createElement('div');
    head.className = 'shop-head';
    head.append(this.portrait, words);

    this.tabs = document.createElement('div');
    this.tabs.className = 'shop-tabs';
    this.tabs.setAttribute('role', 'tablist');
    this.tabs.setAttribute('aria-label', text.sides);
    const purse = document.createElement('div');
    purse.className = 'pack-coins shop-coins';
    const coinIcon = document.createElement('canvas');
    coinIcon.setAttribute('aria-hidden', 'true');
    drawIcon(coinIcon, art.frame('item/coin'));
    const coinName = document.createElement('span');
    coinName.textContent = STRINGS.pack.coins;
    this.coins = document.createElement('span');
    this.coins.className = 'pack-coin-count';
    purse.append(coinIcon, coinName, this.coins);
    const bar = document.createElement('div');
    bar.className = 'shop-bar';
    bar.append(this.tabs, purse);

    this.list = document.createElement('ul');
    this.list.className = 'shop-wares';
    this.list.setAttribute('role', 'tabpanel');
    this.empty = document.createElement('p');
    this.empty.className = 'menu-hint';
    this.empty.textContent = text.nothing;
    const wares = document.createElement('div');
    wares.className = 'shop-list';
    wares.append(this.list, this.empty);

    this.detail = document.createElement('div');
    this.detail.className = 'pack-detail shop-detail';
    this.detail.setAttribute('aria-live', 'polite');
    const packHead = document.createElement('div');
    packHead.className = 'pack-head shop-pack-head';
    const packTitle = document.createElement('p');
    packTitle.className = 'settings-heading';
    packTitle.textContent = text.pack;
    this.slotsLabel = document.createElement('span');
    this.slotsLabel.className = 'pack-count';
    packHead.append(packTitle, this.slotsLabel);
    this.grid = document.createElement('ul');
    this.grid.className = 'pack-slots shop-pack';
    this.grid.setAttribute('aria-label', text.pack);
    const side = document.createElement('div');
    side.className = 'shop-side';
    side.append(this.detail, packHead, this.grid);

    const body = document.createElement('div');
    body.className = 'shop-body';
    body.append(wares, side);
    const keys = document.createElement('p');
    keys.className = 'conversation-keys';
    keys.textContent = text.keys;
    this.panel.append(close, head, bar, body, keys);
    document.body.append(this.panel);

    window.addEventListener('keydown', (event) => this.key(event), { capture: true });
    // A key that makes a trade must not also click the focused button when it goes up.
    window.addEventListener(
      'keyup',
      (event) => {
        if (this.shop && (event.code === 'Space' || event.code === 'Enter')) event.preventDefault();
      },
      { capture: true },
    );
    // Another top-right panel (the pack, the map) takes the place: the shop closes, and the conversation shows again.
    onOtherPanelOpen('shop', () => this.leave());
  }

  get open(): boolean {
    return this.shop !== null;
  }

  /** The side that is open, and the chosen ware (for the debug panel), or null. */
  get state(): { readonly side: ShopSide; readonly chosen: string | null } | null {
    return this.shop ? { side: this.side, chosen: this.chosen } : null;
  }

  /**
   * Opens `shop` at `side` (else its first side with wares), for `trader`. `facts` gives the
   * character now: the panel reads it again at each update.
   */
  show(shop: Shop, side: ShopSide | undefined, trader: Trader, facts: () => TraderFacts): void {
    this.shop = shop;
    this.facts = facts;
    this.side = side ?? (shopWares(shop, 'buy').length > 0 ? 'buy' : 'sell');
    this.chosen = null;
    this.shown = '';
    this.name.textContent = tw(trader.name);
    if (trader.face) drawCloseup(this.portrait, trader.face);
    this.portrait.hidden = trader.face === null;
    this.say(trader.say);
    this.renderTabs();
    this.panel.hidden = false;
    announceOpenPanel('shop');
    this.update();
    this.focusChosen();
  }

  /** What the trader says now (after a trade). */
  say(line: string): void {
    this.said.textContent = tw(line);
  }

  /** Draws the shop again if the character changed (its pack, its gear, its quests, its traits): call it each frame. */
  update(): void {
    if (!this.shop) return;
    const facts = this.facts();
    if (this.keyOf(facts) === this.shown) return;
    const focused = this.panel.contains(document.activeElement);
    this.rows = wareRows(this.shop, this.side, facts);
    if (!this.rows.some((row) => row.ware.id === this.chosen)) this.chosen = this.rows[0]?.ware.id ?? null;
    this.coins.textContent = String(facts.pack.coins);
    this.slotsLabel.textContent = STRINGS.pack.slots(usedSlots(facts.pack), facts.traits.slots);
    this.renderRows();
    this.renderDetail(facts);
    this.renderPack(facts);
    this.shown = this.keyOf(facts);
    // The rows are new elements: the focus goes to the chosen row again, as before.
    if (focused) this.focusChosen();
  }

  /** What the panel shows depends on: the side, the choice, and the character. */
  private keyOf(facts: TraderFacts): string {
    const { pack, gear, book, traits } = facts;
    return JSON.stringify([this.side, this.chosen, pack, gear, book, traits.slots, traits.buyShare, traits.sellShare, traits.scores, traits.class]);
  }

  /** Closes the panel without telling the game (the conversation ended). */
  close(): void {
    if (!this.shop) return;
    this.shop = null;
    this.rows = [];
    this.panel.hidden = true;
    // Give the focus back to the page, or the keys of the game stop working.
    if (document.activeElement instanceof HTMLElement && this.panel.contains(document.activeElement)) document.activeElement.blur();
  }

  /** The player closes the panel: the game shows the conversation again. */
  private leave(): void {
    if (!this.shop) return;
    this.close();
    this.events.close();
  }

  private sides(): ShopSide[] {
    const shop = this.shop;
    if (!shop) return [];
    return (['buy', 'sell'] as const).filter((side) => shopWares(shop, side).length > 0);
  }

  private setSide(side: ShopSide): void {
    if (side === this.side || !this.sides().includes(side)) return;
    this.side = side;
    this.chosen = null;
    this.renderTabs();
    this.update();
    this.focusChosen();
  }

  private renderTabs(): void {
    const sides = this.sides();
    this.tabs.hidden = sides.length < 2;
    this.tabs.replaceChildren(
      ...sides.map((side) => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'shop-tab';
        tab.dataset.side = side;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(side === this.side));
        tab.textContent = side === 'buy' ? STRINGS.shop.buy : STRINGS.shop.sell;
        tab.addEventListener('click', () => {
          this.events.sound?.('select');
          this.setSide(side);
        });
        return tab;
      }),
    );
  }

  private renderRows(): void {
    this.empty.hidden = this.rows.length > 0;
    this.list.replaceChildren(
      ...this.rows.map((row) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shop-ware';
        button.dataset.ware = row.ware.id;
        if (row.ware.id === this.chosen) button.classList.add('chosen');
        if (row.problem === 'gate') button.classList.add('dim');
        if (row.problem) button.classList.add('short');
        // On the side to sell, an item that the player does not have in its pack.
        if (row.problem === 'none' || row.problem === 'worn') button.classList.add('absent');
        const icon = document.createElement('canvas');
        icon.setAttribute('aria-hidden', 'true');
        drawIcon(icon, this.art.frame(`item/${row.ware.kind}`), ROW_SCALE);
        const name = document.createElement('span');
        name.className = 'shop-ware-name';
        // A ware behind a gate shows the gate, as an answer of a conversation does.
        name.textContent = (row.problem === 'gate' && row.ware.gate ? `${gateTag(row.ware.gate)} ` : '') + STRINGS.items[row.ware.kind].name;
        const have = document.createElement('span');
        have.className = 'shop-ware-have';
        have.textContent = row.have > 0 ? STRINGS.pack.count(row.have) : '';
        const price = document.createElement('span');
        price.className = 'shop-ware-price';
        price.textContent = row.side === 'buy' ? STRINGS.shop.price(row.coins) : STRINGS.shop.pay(row.coins);
        button.append(icon, name, have, price);
        button.setAttribute('aria-pressed', String(row.ware.id === this.chosen));
        button.addEventListener('click', () => this.choose(row.ware.id));
        item.append(button);
        return item;
      }),
    );
  }

  /** The detail of the chosen ware: what it is, what it does, the world's line, and its trade. */
  private renderDetail(facts: TraderFacts): void {
    this.detail.replaceChildren();
    const row = this.rows.find((r) => r.ware.id === this.chosen);
    this.detail.hidden = !row;
    if (!row) return;
    const kind = row.ware.kind;
    const names = STRINGS.items[kind];
    const top = document.createElement('div');
    top.className = 'pack-detail-top';
    const icon = document.createElement('canvas');
    icon.className = 'pack-detail-icon';
    icon.setAttribute('aria-hidden', 'true');
    drawIcon(icon, this.art.frame(`item/${kind}`), DETAIL_SCALE);
    const words = document.createElement('div');
    words.append(this.line('pack-detail-name', names.name));
    for (const line of wearLines(kind, facts.traits)) words.append(this.line('pack-detail-use', line));
    if (WEARABLES[kind] && !canUse(facts.traits.class, kind)) words.append(this.line('pack-detail-use dim', STRINGS.gear.cannot(STRINGS.classes[facts.traits.class].name)));
    const drink = DRINKS[kind];
    const view = drinkView(kind, facts.traits.scores);
    if (drink && view === 'open') words.append(this.line('pack-detail-use', STRINGS.pack.effect(drink.gate !== undefined, effectParts(drink))));
    else if (drink?.gate && view === 'hint') words.append(this.line('pack-detail-use dim', `${gateTag(drink.gate)} ${STRINGS.pack.chewHint(names.a)}`));
    const about = this.lines[kind];
    if (about) words.append(this.line('pack-detail-about', tw(about)));
    if (row.have > 0) words.append(this.line('pack-detail-stack', STRINGS.shop.have(row.have)));
    top.append(icon, words);

    const buying = row.side === 'buy';
    const price = buying ? STRINGS.shop.price(row.coins) : STRINGS.shop.pay(row.coins);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pack-action main shop-trade';
    button.textContent = `${buying ? STRINGS.shop.buy : STRINGS.shop.sell} · ${price}`;
    const title = (buying ? STRINGS.shop.buyWhat : STRINGS.shop.sellWhat)(names.a, price);
    button.title = title;
    button.setAttribute('aria-label', title);
    button.disabled = row.problem !== null;
    button.addEventListener('click', () => this.trade());
    const actions = document.createElement('div');
    actions.className = 'pack-actions';
    actions.append(button);
    this.detail.append(top, actions);
    if (row.problem) this.detail.append(this.line('shop-problem', problemText(row)));
  }

  /** The pack: its slots as they are, to see what it holds and the room that is left. */
  private renderPack(facts: TraderFacts): void {
    const items = facts.pack.items;
    this.grid.replaceChildren();
    for (let i = 0; i < Math.max(facts.traits.slots, items.length); i++) {
      const stack = items[i];
      const slot = document.createElement('li');
      slot.className = stack ? 'pack-slot' : 'pack-slot pack-slot-free';
      if (stack) {
        const title = STRINGS.pack.stack(stack.count, STRINGS.items[stack.kind]);
        slot.title = title;
        slot.setAttribute('aria-label', title);
        const icon = document.createElement('canvas');
        icon.setAttribute('aria-hidden', 'true');
        drawIcon(icon, this.art.frame(`item/${stack.kind}`), 1);
        const number = document.createElement('span');
        number.className = 'pack-stack';
        number.textContent = stack.count > 1 ? String(stack.count) : '';
        slot.append(icon, number);
      }
      this.grid.append(slot);
    }
  }

  private line(className: string, text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    return p;
  }

  private choose(id: string): void {
    if (id === this.chosen) return;
    this.chosen = id;
    this.events.sound?.('choose');
    this.update();
  }

  /** Moves the choice up (-1) or down (+1) the rows, round the list. */
  private move(step: number): void {
    const n = this.rows.length;
    if (n === 0) return;
    const at = Math.max(0, this.rows.findIndex((row) => row.ware.id === this.chosen));
    this.chosen = this.rows[(((at + step) % n) + n) % n]!.ware.id;
    this.events.sound?.('select');
    this.update();
    this.focusChosen();
  }

  /** Makes the trade of the chosen ware, if it can go: then the trader says its line (Ware.says, else Shop.bought or Shop.sold). */
  private trade(): void {
    const row = this.rows.find((r) => r.ware.id === this.chosen);
    if (!row || row.problem || !this.shop || !this.events.trade(row)) return;
    const line = row.ware.says ?? (row.side === 'buy' ? this.shop.bought : this.shop.sold);
    if (!line) return;
    this.say(line);
    this.events.line?.(line);
  }

  private focusChosen(): void {
    const button = this.list.querySelector<HTMLButtonElement>('.shop-ware.chosen');
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest' });
  }

  private key(event: KeyboardEvent): void {
    if (!this.shop || event.ctrlKey || event.metaKey || event.altKey) return;
    const code = event.code;
    let handled = true;
    if (code === 'ArrowUp' || code === 'KeyW') this.move(-1);
    else if (code === 'ArrowDown' || code === 'KeyS') this.move(1);
    else if (code === 'ArrowLeft' || code === 'KeyA') this.setSide('buy');
    else if (code === 'ArrowRight' || code === 'KeyD') this.setSide('sell');
    else if (code === 'KeyE' || code === 'Enter' || code === 'Space') {
      if (!event.repeat) this.trade();
    } else if (code === 'Escape') this.leave();
    // The other keys of the game that would act do nothing while the shop is open.
    else if (!['KeyJ', 'KeyI'].includes(code)) handled = false;
    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

/** Why the trade of a row cannot go, in words. */
function problemText(row: WareRow): string {
  switch (row.problem) {
    case 'gate':
      return STRINGS.shop.gate(row.ware.gate ? gateTag(row.ware.gate) : '');
    case 'coins':
      return STRINGS.shop.coins;
    case 'room':
      return STRINGS.shop.room;
    case 'worn':
      return STRINGS.shop.worn;
    case 'none':
      return STRINGS.shop.none;
    default:
      return '';
  }
}
