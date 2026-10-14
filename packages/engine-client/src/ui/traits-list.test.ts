import { describe, expect, it } from 'vitest';
import { ABILITIES, EMPTY_GEAR, PLAIN_SCORES, kitOf, traitsOf, type Scores } from '@game/engine';
import { traitSheet, type TraitGroup } from './traits-list.ts';

const scores = (changes: Partial<Scores>): Scores => ({ ...PLAIN_SCORES, ...changes });
const group = (sheet: ReturnType<typeof traitSheet>, ability: string): TraitGroup => sheet.groups.find((g) => g.ability === ability)!;
const row = (g: TraitGroup, term: string) => g.rows.find((r) => r.term === term);

describe('the traits list', () => {
  it('gives the key numbers first, then a group for each ability with its score and modifier', () => {
    const sheet = traitSheet(traitsOf(scores({ dex: 15, con: 14 }), 'rogue', kitOf('rogue')));
    expect(sheet.key).toEqual([
      { term: 'Armour Class', value: '13' },
      { term: 'Hit points', value: '10' },
      { term: 'Attack bonus', value: '+4', note: 'with DEX', title: 'd20 + 4 against the AC of a mob' },
      { term: 'Damage', value: '1d6+2', note: '+1d6 sneak attack', title: 'Sneak attack: +1d6 on a mob that does not hunt you' },
    ]);
    expect(sheet.groups.map((g) => [g.ability, g.score, g.modifier])).toEqual([
      ['str', 10, 0],
      ['dex', 15, 2],
      ['con', 14, 2],
      ['int', 10, 0],
      ['wis', 10, 0],
      ['cha', 10, 0],
    ]);
    expect(sheet.groups.map((g) => g.rows.length)).toEqual([6, 7, 4, 4, 6, 6]);
  });

  it('shows what a character carries under Strength, and its light roll under Dexterity', () => {
    const sheet = traitSheet(traitsOf(scores({ str: 8, dex: 16 }), 'wizard', kitOf('wizard')));
    expect(row(group(sheet, 'str'), 'Carry')).toEqual({ term: 'Carry', value: '120 lb (a light roll up to 40)', tone: 'worse' });
    // DEX 16: 36 + 6 px (2.6 tiles), and safe in all 15 ticks.
    expect(row(group(sheet, 'dex'), 'Light roll')).toEqual({ term: 'Light roll', value: '2.6 tiles, 0.25 s safe', tone: 'better' });
  });

  it('shows the stamina of each attack under Constitution, by the weapon', () => {
    const rogue = traitSheet(traitsOf(scores({ con: 14 }), 'rogue', kitOf('rogue')));
    expect(row(group(rogue, 'con'), 'Each attack')).toEqual({ term: 'Each attack', value: '4 stamina', tone: 'plain' });
    const barbarian = traitSheet(traitsOf(PLAIN_SCORES, 'barbarian', kitOf('barbarian')));
    expect(row(group(barbarian, 'con'), 'Each attack')?.value).toBe('10 stamina');
  });

  it('shows what a brace adds to the AC under Dexterity, for a melee attack only', () => {
    const rogue = traitSheet(traitsOf(scores({ dex: 15 }), 'rogue', kitOf('rogue')));
    expect(row(group(rogue, 'dex'), 'Brace')).toEqual({ term: 'Brace', value: 'AC +4', tone: 'better' });
    const fighter = traitSheet(traitsOf(PLAIN_SCORES, 'fighter', kitOf('fighter')));
    expect(row(group(fighter, 'dex'), 'Brace')).toEqual({ term: 'Brace', value: 'AC +2', tone: 'plain' });
    const ranger = traitSheet(traitsOf(scores({ dex: 14 }), 'ranger', kitOf('ranger')));
    expect(row(group(ranger, 'dex'), 'Brace')).toBeUndefined();
  });

  it('shows a scale better or worse with the modifier of its ability, and plain at 10', () => {
    const sheet = traitSheet(traitsOf(scores({ str: 8, dex: 16 }), 'wizard', kitOf('wizard')));
    expect(row(group(sheet, 'str'), 'Knockback')).toEqual({ term: 'Knockback', value: '−15%', tone: 'worse' });
    expect(row(group(sheet, 'dex'), 'Roll')).toEqual({ term: 'Roll', value: 'every 1.00 s', tone: 'better' });
    expect(row(group(sheet, 'con'), 'Stun from a hit')).toEqual({ term: 'Stun from a hit', value: 'normal', tone: 'plain' });
  });

  it('never shows a bonus that a low score does not take away as worse', () => {
    const sheet = traitSheet(traitsOf(scores({ int: 8, cha: 8 }), 'fighter', kitOf('fighter')));
    expect(row(group(sheet, 'int'), 'A blow on a wind-up')?.tone).toBe('plain');
    expect(row(group(sheet, 'cha'), 'Others hit near you')?.tone).toBe('plain');
    expect(row(group(sheet, 'cha'), 'Prices')?.tone).toBe('worse');
  });

  it('names every gate: open, or closed with its score', () => {
    const sheet = traitSheet(traitsOf(scores({ str: 13, int: 13 }), 'fighter', EMPTY_GEAR));
    expect(row(group(sheet, 'str'), 'Barred doors')).toEqual({ term: 'Barred doors', value: 'you break them', tone: 'better' });
    expect(row(group(sheet, 'dex'), 'Locked chests')).toEqual({ term: 'Locked chests', value: 'from DEX 13', tone: 'closed' });
    expect(row(group(sheet, 'int'), 'Read a mob')).toEqual({ term: 'Read a mob', value: 'its health', tone: 'better' });
    expect(row(group(sheet, 'wis'), 'Insight')?.tone).toBe('closed');
  });

  it('shows the slow walk of heavy armour under Strength, and the arrows of a bow under Dexterity', () => {
    const fighter = traitSheet(traitsOf(scores({ str: 8 }), 'fighter', kitOf('fighter')));
    expect(group(fighter, 'str').rows[0]).toEqual({ term: 'Walk', value: '25% slower (armour)', tone: 'worse' });
    expect(row(group(fighter, 'dex'), 'Arrows fly')).toBeUndefined();
    const ranger = traitSheet(traitsOf(scores({ dex: 14 }), 'ranger', kitOf('ranger')));
    expect(row(group(ranger, 'str'), 'Walk')).toBeUndefined();
    expect(row(group(ranger, 'dex'), 'Arrows fly')).toEqual({ term: 'Arrows fly', value: '7 tiles', tone: 'better' });
    expect(ranger.key[3]).toEqual({ term: 'Damage', value: '1d8+2' });
  });

  it('shows the scores without the luck of an amulet in the groups, and opens the gates with it', () => {
    const sheet = traitSheet(traitsOf(scores({ str: 12 }), 'fighter', { ...EMPTY_GEAR, neck: 'luck-amulet' }));
    expect(group(sheet, 'str').score).toBe(12);
    expect(row(group(sheet, 'str'), 'Shallow water')).toEqual({ term: 'Shallow water', value: 'you wade through it', tone: 'better' });
    expect(sheet.groups.map((g) => g.ability)).toEqual([...ABILITIES]);
  });
});
