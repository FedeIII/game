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
    for (const answer of node.answers) {
      if (!answer.text || answer.text.length > DIALOG_LIMITS.answer) problems.push(`${id}: the answer "${answer.text}" is empty or too long`);
      if (answer.next !== undefined && !dialog.nodes[answer.next]) problems.push(`${id}: the answer "${answer.text}" leads to no node "${answer.next}"`);
    }
  }
  // Every node from the start.
  const reached = new Set<string>();
  const queue = dialog.nodes[dialog.start] ? [dialog.start] : [];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const answer of dialog.nodes[id]!.answers) if (answer.next !== undefined && dialog.nodes[answer.next]) queue.push(answer.next);
  }
  for (const id of ids) if (!reached.has(id)) problems.push(`${id}: no answer leads to it`);
  // An end from every node: the nodes that can end, found backwards from the answers that end.
  const ends = new Set(ids.filter((id) => dialog.nodes[id]!.answers.some((a) => a.next === undefined)));
  for (let grew = true; grew; ) {
    grew = false;
    for (const id of ids) {
      if (!ends.has(id) && dialog.nodes[id]!.answers.some((a) => a.next !== undefined && ends.has(a.next))) {
        ends.add(id);
        grew = true;
      }
    }
  }
  for (const id of ids) if (!ends.has(id)) problems.push(`${id}: the conversation cannot end from it`);
  return problems;
}
