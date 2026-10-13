import { MAX_COINS, addToPack, hasItems, lootIsEmpty, removeFromPack, type ItemKind, type ItemStack, type Pack } from './items.ts';
import { ALE_TICKS, type PlayerState } from './player.ts';
import { firstThatHolds, holds, type Conditions, type QuestBook, type QuestEffect } from './quests.ts';
import type { Gate, PlayerTraits } from './traits.ts';

/**
 * Conversations: a tree of what an NPC says and what the player can answer. A world gives an
 * NPC a dialog in its content (Interaction.dialog). The client runs the conversation (the
 * engine has no state for it): the NPC says the line of a node, and the player picks one of its
 * answers, which leads to the next node or ends the conversation. Pure data, so a world can
 * check its dialogs in a test (checkDialog).
 */

export interface DialogAnswer {
  /** What the player says. */
  readonly text: string;
  /** The node that comes next. Without it, this answer ends the conversation. */
  readonly next?: string;
  /**
   * An answer behind a gate (an Intelligence answer, for example): only a character that passes
   * the gate can give it; one 1 or 2 under it sees it dim, with the gate; others do not see it
   * (gateView). A node needs at least one answer without a gate.
   */
  readonly gate?: Gate;
  /**
   * A purchase: the player pays `price` coins for `goods`. With enough coins the conversation goes
   * on to `next`; without, to `poor`. In a shared world the server checks the coins and the NPC's
   * nearness again, and takes the coins (Room.deal).
   */
  readonly deal?: Deal;
  /**
   * Conditions on the quests and the pack (quests.ts): only a character for whom they hold sees
   * the answer. The server checks them again for an answer with an effect.
   */
  readonly when?: Conditions;
  /**
   * What the answer does to a quest (quests.ts): it starts it or moves it on, and it can take items
   * and give a reward. Only a character for whom the effect can apply (canApply) sees the answer.
   * In a shared world the server checks the NPC's nearness, the gate, the conditions and the
   * effect again, and applies it (Room.quest).
   */
  readonly effect?: QuestEffect;
  /**
   * A shop: the answer opens its panel, at the side `tab` (else the first side that it has). The
   * conversation goes on to `next`, and it shows again when the panel closes. The gate and the
   * conditions of the answer count for every ware of the shop (findDeal).
   */
  readonly shop?: Shop;
  readonly tab?: ShopSide;
}

/**
 * What a deal gives: an ale (a drink, player.ts ALE_TICKS), an item into the pack (a draught),
 * coins (a sale: `pay`), or a refuge for the character (`refuge`: a room at the inn).
 */
export type Goods = 'ale' | 'coins' | 'refuge' | ItemKind;

export interface Deal {
  /** The server finds the deal by it: two answers with the same id must have the same deal. */
  readonly id: string;
  readonly goods: Goods;
  /** Coins that the player pays (0 for none), before Charisma (dealPrice). */
  readonly price: number;
  /** Items that the player pays (the herbs of a draught, the ring of a sale). */
  readonly items?: readonly ItemStack[];
  /** For goods 'coins': the coins that the player gets, before Charisma (dealPay). */
  readonly pay?: number;
  /** For goods 'refuge': the id of the refuge that the character gets (WorldSource.refuges). */
  readonly refuge?: string;
  /**
   * The deal of an answer: the node when the player has fewer coins or items than the deal asks, or
   * no room for the goods. A ware of a shop has none: its panel shows why a trade cannot go.
   */
  readonly poor?: string;
}

/** A side of a shop, as the player sees it: what it buys from the trader, or what it sells to the trader. */
export type ShopSide = 'buy' | 'sell';

/** The sides of a shop, in the order of the panel. */
export const SHOP_SIDES: readonly ShopSide[] = ['buy', 'sell'];

/** A thing of a shop: one item that the player buys from the trader, or sells to it, for coins. */
export interface Ware {
  /** The server finds the trade by it, as a deal (Room.deal): another deal or ware of the dialog with this id must be the same. */
  readonly id: string;
  readonly kind: ItemKind;
  /** The coins for one, before Charisma: what the player pays (Shop.buy), or what it gets (Shop.sell). */
  readonly price: number;
  /** Only a character that passes the gate makes the trade (a friend's price); one 1 or 2 under it sees it dim (gateView). */
  readonly gate?: Gate;
  /** Only a character for whom the conditions hold sees the ware and makes the trade (quests.ts). */
  readonly when?: Conditions;
  /** What the trader says after this trade, in place of Shop.bought or Shop.sold. */
  readonly says?: string;
}

/**
 * A shop (Fede's request, 2026-10-13): what a trader sells, and what it buys, one item for each
 * trade. An answer opens it (DialogAnswer.shop), and the page shows it in a panel with a side to
 * buy and a side to sell. Each trade is a deal (wareDeal): in a shared world the server checks it
 * as it checks the deal of an answer (Room.deal).
 */
export interface Shop {
  /** What the trader sells: the player buys it. */
  readonly buy?: readonly Ware[];
  /** What the trader buys: the player sells it, from its pack (not what it wears). */
  readonly sell?: readonly Ware[];
  /** What the trader says after a purchase, and after a sale. */
  readonly bought?: string;
  readonly sold?: string;
}

/** The deal of a trade of a ware: an item for coins (a purchase), or coins for an item (a sale). */
export function wareDeal(ware: Ware, side: ShopSide): Deal {
  return side === 'buy'
    ? { id: ware.id, goods: ware.kind, price: ware.price }
    : { id: ware.id, goods: 'coins', price: 0, pay: ware.price, items: [{ kind: ware.kind, count: 1 }] };
}

/** The wares of one side of a shop. */
export function shopWares(shop: Shop, side: ShopSide): readonly Ware[] {
  return (side === 'buy' ? shop.buy : shop.sell) ?? [];
}

/** The coins that a player with `traits` pays for a deal: its price times its buyShare (Charisma), at least 1 if it has a price. */
export function dealPrice(deal: Deal, traits: Pick<PlayerTraits, 'buyShare'>): number {
  return deal.price > 0 ? Math.max(1, Math.round(deal.price * traits.buyShare)) : 0;
}

/** The coins that a player with `traits` gets from a sale: its pay times its sellShare (Charisma), at least 1. */
export function dealPay(deal: Deal, traits: Pick<PlayerTraits, 'sellShare'>): number {
  return deal.goods === 'coins' ? Math.max(1, Math.round((deal.pay ?? 0) * traits.sellShare)) : 0;
}

/**
 * Makes a deal for a player with `pack`: it pays the coins (dealPrice) and the items, and gets the
 * goods (an ale: a drink; an item: into the pack; coins: dealPay into the purse). Returns the new
 * pack, or null when the player cannot pay or has no room for the goods (then nothing changes).
 * For a refuge, the caller gives the refuge to the character.
 */
export function makeDeal(deal: Deal, pack: Pack, state: PlayerState, traits: Pick<PlayerTraits, 'slots' | 'resist' | 'buyShare' | 'sellShare'>): Pack | null {
  const price = dealPrice(deal, traits);
  if (pack.coins < price || !hasItems(pack, deal.items ?? [])) return null;
  let next: Pack = removeFromPack({ coins: pack.coins - price, items: pack.items }, deal.items ?? []);
  if (deal.goods === 'ale') {
    state.drunk = Math.round(ALE_TICKS * traits.resist);
    return next;
  }
  if (deal.goods === 'coins') return { coins: Math.min(MAX_COINS, next.coins + dealPay(deal, traits)), items: next.items };
  if (deal.goods === 'refuge') return next;
  const added = addToPack(next, { coins: 0, items: [{ kind: deal.goods, count: 1 }] }, traits.slots);
  if (!lootIsEmpty(added.left)) return null;
  next = added.pack;
  return next;
}

/** A player must be this close to an NPC to buy from it (world pixels): the conversation's range, with a margin. */
export const DEAL_RANGE = 48;

/** Whether a player with `pack` can make the deal now: the coins, the items, and room for the goods. */
export function canMakeDeal(deal: Deal, pack: Pack, traits: Pick<PlayerTraits, 'slots' | 'buyShare'>): boolean {
  if (pack.coins < dealPrice(deal, traits) || !hasItems(pack, deal.items ?? [])) return false;
  if (deal.goods === 'ale' || deal.goods === 'coins' || deal.goods === 'refuge') return true;
  const after = removeFromPack(pack, deal.items ?? []);
  return lootIsEmpty(addToPack(after, { coins: 0, items: [{ kind: deal.goods, count: 1 }] }, traits.slots).left);
}

/**
 * A deal that a character can ask for, and what it must pass for it: the gates and the conditions
 * of its answer, and for a ware of a shop also those of the ware.
 */
export interface DealOffer {
  readonly deal: Deal;
  readonly gates: readonly Gate[];
  readonly when: readonly Conditions[];
}

/** Every deal of a dialog: the deal of each answer, and each ware of the shop of each answer (wareDeal). */
export function dialogDeals(dialog: Dialog): DealOffer[] {
  const offers: DealOffer[] = [];
  for (const node of Object.values(dialog.nodes)) {
    for (const answer of node.answers) {
      const gates = answer.gate ? [answer.gate] : [];
      const when = answer.when ? [answer.when] : [];
      if (answer.deal) offers.push({ deal: answer.deal, gates, when });
      if (!answer.shop) continue;
      for (const side of SHOP_SIDES) {
        for (const ware of shopWares(answer.shop, side)) {
          offers.push({ deal: wareDeal(ware, side), gates: ware.gate ? [...gates, ware.gate] : gates, when: ware.when ? [...when, ware.when] : when });
        }
      }
    }
  }
  return offers;
}

/** The deal of the dialog with this id (of an answer, or a ware of a shop), with its gates and conditions, or null. */
export function findDeal(dialog: Dialog, id: string): DealOffer | null {
  return dialogDeals(dialog).find((offer) => offer.deal.id === id) ?? null;
}

export interface DialogNode {
  /** What the NPC says. */
  readonly say: string;
  /** What the player can answer, in this order (1 to DIALOG_LIMITS.answers). */
  readonly answers: readonly DialogAnswer[];
}

export interface Dialog {
  /** The name of the NPC, over its picture in the conversation. */
  readonly name: string;
  /** The node that the conversation starts with, if no node of `starts` comes first. */
  readonly start: string;
  /** Other first nodes, by the quests (quests.ts): the first whose conditions hold, else `start`. An NPC greets a character by its step. */
  readonly starts?: readonly { readonly when: Conditions; readonly node: string }[];
  /**
   * A person who does not deal with a character for whom the conditions hold (a wanted robber, story
   * phase 5): the conversation starts at `node` before any other, and the server refuses its deals.
   */
  readonly refuse?: { readonly when: Conditions; readonly node: string };
  readonly nodes: Readonly<Record<string, DialogNode>>;
}

/** The node that a conversation starts with for a character with `book` and `pack` (Dialog.starts, else Dialog.start). */
export function startNode(dialog: Dialog, book: QuestBook, pack: Pack): string {
  if (dialog.refuse && holds(dialog.refuse.when, book, pack)) return dialog.refuse.node;
  const i = firstThatHolds(dialog.starts ?? [], book, pack);
  return i >= 0 ? dialog.starts![i]!.node : dialog.start;
}

/** Whether a character with `book` and `pack` sees an answer: its conditions hold. (An answer with an effect also needs canApply.) */
export function answerHolds(answer: DialogAnswer, book: QuestBook, pack: Pack): boolean {
  return holds(answer.when, book, pack);
}

/** The answer of the dialog with the effect of this id, or null. */
export function findEffectAnswer(dialog: Dialog, id: string): DialogAnswer | null {
  for (const node of Object.values(dialog.nodes)) for (const answer of node.answers) if (answer.effect?.id === id) return answer;
  return null;
}

/** The most answers in a node, and the longest texts (characters): the conversation panel must hold them. */
export const DIALOG_LIMITS = { answers: 4, say: 200, answer: 70, name: 32 } as const;

/**
 * The problems of the shop of an answer (in node `id`): an answer that opens a shop has no deal or
 * effect and goes on to a node; the shop has wares, each at a price, and the side of `tab`; the
 * lines fit the panel; a side has an item only once.
 */
function checkShop(answer: DialogAnswer, id: string): string[] {
  const shop = answer.shop!;
  const problems: string[] = [];
  const where = `${id}: the shop of "${answer.text}"`;
  if (answer.deal || answer.effect) problems.push(`${where} is in an answer with a deal or an effect`);
  if (answer.next === undefined) problems.push(`${where} ends the conversation`);
  if (SHOP_SIDES.every((side) => shopWares(shop, side).length === 0)) problems.push(`${where} has no wares`);
  if (answer.tab && shopWares(shop, answer.tab).length === 0) problems.push(`${where} has nothing on its side "${answer.tab}"`);
  for (const line of [shop.bought, shop.sold]) if (line !== undefined && (!line || line.length > DIALOG_LIMITS.say)) problems.push(`${where}: the line "${line}" is empty or too long`);
  for (const side of SHOP_SIDES) {
    const kinds = new Set<ItemKind>();
    for (const ware of shopWares(shop, side)) {
      if (!(ware.price > 0)) problems.push(`${where}: the ware "${ware.id}" has no price`);
      if (kinds.has(ware.kind) && !ware.gate && !ware.when) problems.push(`${where}: the ${ware.kind} is twice on its side "${side}"`);
      kinds.add(ware.kind);
      if (ware.says !== undefined && (!ware.says || ware.says.length > DIALOG_LIMITS.say)) problems.push(`${where}: the line of "${ware.id}" is empty or too long`);
    }
  }
  return problems;
}

/**
 * The problems of a dialog, as sentences; none for a good one. A good dialog starts at a node that
 * it has, every answer leads to a node that it has, every node can be reached from the start,
 * every node has 1 to DIALOG_LIMITS.answers answers (one of them for every character: no gate, no
 * conditions, no effect), and from every node the player can end the conversation (an answer
 * without `next`, now or later). The nodes of `starts` count as starts.
 */
export function checkDialog(dialog: Dialog): string[] {
  const problems: string[] = [];
  const ids = Object.keys(dialog.nodes);
  if (!dialog.name || dialog.name.length > DIALOG_LIMITS.name) problems.push(`the name "${dialog.name}" is empty or too long`);
  if (!dialog.nodes[dialog.start]) problems.push(`no start node "${dialog.start}"`);
  for (const { node } of dialog.starts ?? []) if (!dialog.nodes[node]) problems.push(`no start node "${node}"`);
  if (dialog.refuse && !dialog.nodes[dialog.refuse.node]) problems.push(`no refuse node "${dialog.refuse.node}"`);
  for (const id of ids) {
    const node = dialog.nodes[id]!;
    if (!node.say || node.say.length > DIALOG_LIMITS.say) problems.push(`${id}: the line is empty or too long`);
    if (node.answers.length < 1 || node.answers.length > DIALOG_LIMITS.answers) problems.push(`${id}: ${node.answers.length} answers`);
    if (node.answers.every((a) => a.gate || a.when || a.effect)) problems.push(`${id}: every answer is behind a gate, a condition or an effect`);
    for (const answer of node.answers) {
      if (!answer.text || answer.text.length > DIALOG_LIMITS.answer) problems.push(`${id}: the answer "${answer.text}" is empty or too long`);
      if (answer.next !== undefined && !dialog.nodes[answer.next]) problems.push(`${id}: the answer "${answer.text}" leads to no node "${answer.next}"`);
      if (answer.deal && !(answer.deal.poor !== undefined && dialog.nodes[answer.deal.poor])) problems.push(`${id}: the deal "${answer.deal.id}" leads to no node "${answer.deal.poor}"`);
      if (answer.deal && answer.next === undefined) problems.push(`${id}: the deal "${answer.deal.id}" ends the conversation`);
      if (answer.deal?.goods === 'coins' && !(answer.deal.pay! > 0)) problems.push(`${id}: the sale "${answer.deal.id}" pays nothing`);
      if (answer.deal?.goods === 'refuge' && !answer.deal.refuge) problems.push(`${id}: the deal "${answer.deal.id}" gives no refuge`);
      if (answer.deal && answer.effect) problems.push(`${id}: the answer "${answer.text}" has a deal and an effect`);
      if (answer.shop) problems.push(...checkShop(answer, id));
    }
  }
  // One effect can be in several answers, but two different effects must not share an id.
  const effects = new Map<string, string>();
  for (const id of ids) {
    for (const { effect } of dialog.nodes[id]!.answers) {
      if (!effect) continue;
      const shape = JSON.stringify(effect);
      const same = effects.get(effect.id);
      if (same !== undefined && same !== shape) problems.push(`two effects have the id "${effect.id}"`);
      effects.set(effect.id, shape);
    }
  }
  // One deal can be in several answers and shops, but two different deals must not share an id: the
  // server finds a deal by its id (findDeal).
  const deals = new Map<string, string>();
  for (const { deal, gates, when } of dialogDeals(dialog)) {
    const same = deals.get(deal.id);
    const shape = JSON.stringify([deal.goods, deal.price, deal.poor ?? '', deal.items ?? [], deal.pay ?? 0, deal.refuge ?? '', gates, when]);
    if (same !== undefined && same !== shape) problems.push(`two deals have the id "${deal.id}"`);
    deals.set(deal.id, shape);
  }
  /** The nodes that an answer leads to: its next, and the node for too few coins. */
  const leads = (a: DialogAnswer): string[] => [...(a.next !== undefined ? [a.next] : []), ...(a.deal?.poor !== undefined ? [a.deal.poor] : [])];
  // Every node from the start.
  const reached = new Set<string>();
  const queue = [dialog.start, ...(dialog.starts ?? []).map((s) => s.node), ...(dialog.refuse ? [dialog.refuse.node] : [])].filter((n) => dialog.nodes[n]);
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const answer of dialog.nodes[id]!.answers) for (const to of leads(answer)) if (dialog.nodes[to]) queue.push(to);
  }
  for (const id of ids) if (!reached.has(id)) problems.push(`${id}: no answer leads to it`);
  // An end from every node, for every character: the nodes that can end, found backwards from the
  // answers that end. An answer behind a gate, a condition or an effect does not count: not
  // everybody can give it.
  const open = (a: DialogAnswer) => !a.gate && !a.when && !a.effect;
  const ends = new Set(ids.filter((id) => dialog.nodes[id]!.answers.some((a) => a.next === undefined && open(a))));
  for (let grew = true; grew; ) {
    grew = false;
    for (const id of ids) {
      if (!ends.has(id) && dialog.nodes[id]!.answers.some((a) => open(a) && leads(a).some((to) => ends.has(to)))) {
        ends.add(id);
        grew = true;
      }
    }
  }
  for (const id of ids) if (!ends.has(id)) problems.push(`${id}: the conversation cannot end from it`);
  return problems;
}
