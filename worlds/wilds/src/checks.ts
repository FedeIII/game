import { DRINKS, WADE_GATE, type Ability, type Dialog, type Fixture, type Gate, type Interaction, type ItemKind } from '@game/engine';
import { HOME_CELL } from './houses.ts';
import type { WildsSource } from './source.ts';

/**
 * The register of the checks of the Wilds: every gate of the content, with its DC and its context
 * (Fede, 2026-10-15). It is the list to read when you choose or change a DC
 * (docs/features/abilities/checks.md): `npm run checks` prints it, with the gates of the page.
 */
export interface CheckEntry {
  readonly ability: Ability;
  readonly dc: number;
  /** What the check opens (`page`: a gate that the page applies, not the world: scripts/checks.ts). */
  readonly kind: 'answer' | 'ware' | 'lore' | 'scene' | 'lock' | 'boards' | 'drink' | 'wade' | 'page';
  /** Where it is: the conversation and its node, the thing and its place, the scene. */
  readonly where: string;
  /** What is behind it: the answer, the first page, the line, the ware. */
  readonly text: string;
}

/** The houses of the wilds in this many cells round the home: enough to meet every book and every grade of chest. */
const HOUSE_CELLS = 8;

/** Every check of the content of the Wilds, once each (a book or a grade of chest that many houses share comes once). */
export function checksOf(source: WildsSource): CheckEntry[] {
  const out: CheckEntry[] = [];
  const seen = new Set<string>();
  const add = (gate: Gate, kind: CheckEntry['kind'], where: string, text: string) => {
    const key = JSON.stringify([gate.ability, gate.dc, kind, where, text]);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ability: gate.ability, dc: gate.dc, kind, where, text });
  };
  const dialogs = new Set<Dialog>();
  const dialog = (d: Dialog) => {
    if (dialogs.has(d)) return;
    dialogs.add(d);
    for (const [id, node] of Object.entries(d.nodes)) {
      for (const answer of node.answers) {
        if (answer.gate) add(answer.gate, 'answer', `${d.name} [${id}]`, answer.text);
        for (const side of ['buy', 'sell'] as const) {
          for (const ware of answer.shop?.[side] ?? []) if (ware.gate) add(ware.gate, 'ware', `${d.name}: ${side}`, ware.kind);
        }
      }
    }
  };
  const content = (c: Interaction | undefined, where: string) => {
    for (const lore of c?.lore ?? []) add(lore.gate, 'lore', where, lore.pages[0] ?? '');
    if (c?.dialog) dialog(c.dialog);
  };
  const fixture = (f: Fixture, where: string) => {
    content(f.content, `${where}: ${f.kind}`);
    content(f.variant?.content, `${where}: ${f.kind}`);
    if (f.lock) add(f.lock, 'lock', `${where}: ${f.kind}`, 'a locked chest');
  };

  add(WADE_GATE, 'wade', 'shallow water', 'wade through it');
  for (const [kind, drink] of Object.entries(DRINKS)) if (drink?.gate) add(drink.gate, 'drink', 'the pack', kind as ItemKind);
  for (const npc of source.npcs()) content(npc.content, npc.id);
  for (const place of source.places()) {
    const [x0, y0, x1, y1] = [place.x0 - 4, place.y0 - 4, place.x1 + 4, place.y1 + 4];
    for (const f of source.fixturesIn(x0, y0, x1, y1)) fixture(f, place.name);
    for (const b of source.buildingsIn(x0, y0, x1, y1)) {
      if (b.barred) add(b.barred, 'boards', `${place.name}: ${b.id}`, 'a barred door');
      for (const storey of b.storeys ?? []) for (const f of storey.fixtures) fixture(f, place.name);
    }
  }
  for (let cy = HOME_CELL[1] - HOUSE_CELLS; cy <= HOME_CELL[1] + HOUSE_CELLS; cy++) {
    for (let cx = HOME_CELL[0] - HOUSE_CELLS; cx <= HOME_CELL[0] + HOUSE_CELLS; cx++) {
      const house = source.house(cx, cy);
      if (!house || house.id === 'home') continue;
      if (house.barred) add(house.barred, 'boards', 'a house of the wilds', 'a barred door, before a chest');
      for (const f of house.fixtures) fixture(f, 'a house of the wilds');
    }
  }
  for (const scene of source.scenes()) for (const line of scene.lines) if (line.gate) add(line.gate, 'scene', `scene ${scene.id} (${line.npc})`, line.text);
  return out;
}

/** The register as a Markdown table, by ability and then by DC. */
export function checksTable(checks: readonly CheckEntry[]): string {
  const order = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const rows = [...checks].sort((a, b) => order.indexOf(a.ability) - order.indexOf(b.ability) || a.dc - b.dc || a.where.localeCompare(b.where));
  const cell = (s: string) => s.replace(/\|/g, '\\|');
  return [
    '| Ability | DC | Kind | Where | What |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((c) => `| ${c.ability.toUpperCase()} | ${c.dc} | ${c.kind} | ${cell(c.where)} | ${cell(c.text.length > 90 ? `${c.text.slice(0, 89)}…` : c.text)} |`),
  ].join('\n');
}
