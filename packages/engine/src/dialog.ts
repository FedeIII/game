import { addToPack, hasItems, lootIsEmpty, removeFromPack, type ItemKind, type ItemStack, type Pack } from './items.ts';
import { ALE_TICKS, type PlayerState } from './player.ts';
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
}

/** What a deal gives: an ale (a drink, player.ts ALE_TICKS), or an item into the pack (a draught from the cauldron). */
export type Goods = 'ale' | ItemKind;

export interface Deal {
  /** The server finds the deal by it: two answers with the same id must have the same deal. */
  readonly id: string;
  readonly goods: Goods;
  /** Coins that the player pays (0 for none). */
  readonly price: number;
  /** Items that the player pays (the herbs of a draught). */
  readonly items?: readonly ItemStack[];
  /** The node when the player has fewer coins or items than the deal asks, or no room for the goods. */
  readonly poor: string;
}

/**
 * Makes a deal for a player with `pack`: it pays the coins and the items, and gets the goods (an
 * ale: a drink; an item: into the pack). Returns the new pack, or null when the player cannot pay
 * or has no room for the goods (then nothing changes).
 */
export function makeDeal(deal: Deal, pack: Pack, state: PlayerState, traits: Pick<PlayerTraits, 'slots' | 'resist'>): Pack | null {
  if (pack.coins < deal.price || !hasItems(pack, deal.items ?? [])) return null;
  let next: Pack = removeFromPack({ coins: pack.coins - deal.price, items: pack.items }, deal.items ?? []);
  if (deal.goods === 'ale') {
    state.drunk = Math.round(ALE_TICKS * traits.resist);
    return next;
  }
  const added = addToPack(next, { coins: 0, items: [{ kind: deal.goods, count: 1 }] }, traits.slots);
  if (!lootIsEmpty(added.left)) return null;
  next = added.pack;
  return next;
}

/** A player must be this close to an NPC to buy from it (world pixels): the conversation's range, with a margin. */
export const DEAL_RANGE = 48;

/** Whether a player with `pack` can make the deal now: the coins, the items, and room for the goods. */
export function canMakeDeal(deal: Deal, pack: Pack, traits: Pick<PlayerTraits, 'slots'>): boolean {
  if (pack.coins < deal.price || !hasItems(pack, deal.items ?? [])) return false;
  if (deal.goods === 'ale') return true;
  const after = removeFromPack(pack, deal.items ?? []);
  return lootIsEmpty(addToPack(after, { coins: 0, items: [{ kind: deal.goods, count: 1 }] }, traits.slots).left);
}

/** The deal of the dialog with this id, or null. */
export function findDeal(dialog: Dialog, id: string): Deal | null {
  return findDealAnswer(dialog, id)?.deal ?? null;
}

/** The answer of the dialog with the deal of this id (its gate counts too), or null. */
export function findDealAnswer(dialog: Dialog, id: string): DialogAnswer | null {
  for (const node of Object.values(dialog.nodes)) for (const answer of node.answers) if (answer.deal?.id === id) return answer;
  return null;
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
  /** The node that the conversation starts with. */
  readonly start: string;
  readonly nodes: Readonly<Record<string, DialogNode>>;
}

/** The most answers in a node, and the longest texts (characters): the conversation panel must hold them. */
export const DIALOG_LIMITS = { answers: 4, say: 200, answer: 70, name: 32 } as const;

/**
 * The problems of a dialog, as sentences; none for a good one. A good dialog starts at a node that
 * it has, every answer leads to a node that it has, every node can be reached from the start,
 * every node has 1 to DIALOG_LIMITS.answers answers, and from every node the player can end the
 * conversation (an answer without `next`, now or later).
 */
export function checkDialog(dialog: Dialog): string[] {
  const problems: string[] = [];
  const ids = Object.keys(dialog.nodes);
  if (!dialog.name || dialog.name.length > DIALOG_LIMITS.name) problems.push(`the name "${dialog.name}" is empty or too long`);
  if (!dialog.nodes[dialog.start]) problems.push(`no start node "${dialog.start}"`);
  for (const id of ids) {
    const node = dialog.nodes[id]!;
    if (!node.say || node.say.length > DIALOG_LIMITS.say) problems.push(`${id}: the line is empty or too long`);
    if (node.answers.length < 1 || node.answers.length > DIALOG_LIMITS.answers) problems.push(`${id}: ${node.answers.length} answers`);
    if (node.answers.every((a) => a.gate)) problems.push(`${id}: every answer is behind a gate`);
    for (const answer of node.answers) {
      if (!answer.text || answer.text.length > DIALOG_LIMITS.answer) problems.push(`${id}: the answer "${answer.text}" is empty or too long`);
      if (answer.next !== undefined && !dialog.nodes[answer.next]) problems.push(`${id}: the answer "${answer.text}" leads to no node "${answer.next}"`);
      if (answer.deal && !dialog.nodes[answer.deal.poor]) problems.push(`${id}: the deal "${answer.deal.id}" leads to no node "${answer.deal.poor}"`);
      if (answer.deal && answer.next === undefined) problems.push(`${id}: the deal "${answer.deal.id}" ends the conversation`);
    }
  }
  // One deal can be in several answers, but two different deals must not share an id.
  const deals = new Map<string, string>();
  for (const id of ids) {
    for (const { deal } of dialog.nodes[id]!.answers) {
      if (!deal) continue;
      const same = deals.get(deal.id);
      const shape = JSON.stringify([deal.goods, deal.price, deal.poor]);
      if (same !== undefined && same !== shape) problems.push(`two deals have the id "${deal.id}"`);
      deals.set(deal.id, shape);
    }
  }
  /** The nodes that an answer leads to: its next, and the node for too few coins. */
  const leads = (a: DialogAnswer): string[] => [...(a.next !== undefined ? [a.next] : []), ...(a.deal ? [a.deal.poor] : [])];
  // Every node from the start.
  const reached = new Set<string>();
  const queue = dialog.nodes[dialog.start] ? [dialog.start] : [];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const answer of dialog.nodes[id]!.answers) for (const to of leads(answer)) if (dialog.nodes[to]) queue.push(to);
  }
  for (const id of ids) if (!reached.has(id)) problems.push(`${id}: no answer leads to it`);
  // An end from every node, for every character: the nodes that can end, found backwards from the
  // answers that end. An answer behind a gate does not count: not everybody can give it.
  const ends = new Set(ids.filter((id) => dialog.nodes[id]!.answers.some((a) => a.next === undefined && !a.gate)));
  for (let grew = true; grew; ) {
    grew = false;
    for (const id of ids) {
      if (!ends.has(id) && dialog.nodes[id]!.answers.some((a) => !a.gate && leads(a).some((to) => ends.has(to)))) {
        ends.add(id);
        grew = true;
      }
    }
  }
  for (const id of ids) if (!ends.has(id)) problems.push(`${id}: the conversation cannot end from it`);
  return problems;
}
