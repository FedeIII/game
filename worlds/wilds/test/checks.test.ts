import { describe, expect, it } from 'vitest';
import { ABILITIES, DC, POINT_BUY, RACE_BONUS } from '@game/engine';
import { CHEST_GRADES, DEFAULT_SEED, WildsSource, checksOf, checksTable } from '../src/index.ts';

/**
 * The checks of the Wilds (Fede, 2026-10-15; docs/features/abilities/checks.md): each check has its own
 * DC from its context, and a DC is the score that the check needs.
 */
const source = new WildsSource(DEFAULT_SEED);
const checks = checksOf(source);

/** The highest score of a character at level 1: the most of the point buy, and the most that a race adds. */
const START_MAX = POINT_BUY.max + Math.max(...Object.values(RACE_BONUS).flatMap((bonus) => Object.values(bonus)));

describe('the register of the checks', () => {
  it('finds every kind of check of the Wilds, on every storey', () => {
    expect(new Set(checks.map((c) => c.kind))).toEqual(new Set(['wade', 'drink', 'answer', 'lore', 'lock', 'boards', 'scene']));
    expect(checks.length).toBeGreaterThan(70);
    // The ledgers of the reeve are on the storey of the town hall.
    expect(checks.some((c) => c.kind === 'lore' && c.text.startsWith('The numbers do not add up'))).toBe(true);
    // Every grade of a guarded chest, behind a lock and behind boards.
    for (const kind of ['lock', 'boards'] as const) {
      expect(new Set(checks.filter((c) => c.kind === kind).map((c) => c.dc)), kind).toEqual(new Set(CHEST_GRADES.map((g) => g.dc)));
    }
  });

  it('has every answer behind a check in the conversations of the people', () => {
    for (const npc of source.npcs()) {
      for (const node of Object.values(npc.content.dialog?.nodes ?? {})) {
        for (const answer of node.answers) {
          if (!answer.gate) continue;
          expect(checks.some((c) => c.kind === 'answer' && c.text === answer.text && c.dc === answer.gate!.dc && c.ability === answer.gate!.ability), answer.text).toBe(true);
        }
      }
    }
  });

  it('prints a table, by ability and DC', () => {
    const table = checksTable(checks).split('\n');
    expect(table[0]).toBe('| Ability | DC | Kind | Where | What |');
    expect(table).toHaveLength(checks.length + 2);
    const abilities = table.slice(2).map((row) => row.split(' | ')[0]!.slice(2).toLowerCase());
    expect(abilities).toEqual([...abilities].sort((a, b) => ABILITIES.indexOf(a as never) - ABILITIES.indexOf(b as never)));
  });
});

describe('the DCs of the Wilds', () => {
  it('are from easy (10) to the highest score at level 1 (17): chapter 1 needs no score that a character cannot have', () => {
    expect(START_MAX).toBe(17);
    for (const c of checks) {
      expect(c.dc, `${c.where}: ${c.text}`).toBeGreaterThanOrEqual(DC.easy);
      expect(c.dc, `${c.where}: ${c.text}`).toBeLessThanOrEqual(START_MAX);
    }
  });

  it('differ by the context of each check, not one DC for all', () => {
    for (const ability of ['str', 'int', 'wis', 'cha'] as const) {
      expect(new Set(checks.filter((c) => c.ability === ability).map((c) => c.dc)).size, ability).toBeGreaterThanOrEqual(3);
    }
  });
});
