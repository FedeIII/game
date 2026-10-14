import { describe, expect, it } from 'vitest';
import { EMPTY_PACK, PLAIN_SCORES, kitOf, traitsOf, type Scores } from '@game/engine';
import { loadLine, wearLines, weightLine } from './pack-panel.ts';

describe('the load', () => {
  it('shows what the character carries and can carry, and the roll that it gives', () => {
    const fighter = (str: number) => traitsOf({ ...PLAIN_SCORES, str } as Scores, 'fighter', kitOf('fighter'));
    expect(loadLine(EMPTY_PACK, kitOf('fighter'), fighter(13))).toEqual({ text: 'Load 64 / 195 lb · light roll', tier: 'light' });
    expect(loadLine({ coins: 0, items: [{ kind: 'draught', count: 3 }] }, kitOf('fighter'), fighter(12))).toEqual({ text: 'Load 65.5 / 180 lb · medium roll', tier: 'medium' });
    const heavy = { coins: 0, items: [{ kind: 'plate-armour' as const, count: 1 }] };
    expect(loadLine(heavy, kitOf('fighter'), fighter(8)).tier).toBe('over');
    expect(loadLine(heavy, kitOf('fighter'), fighter(8)).text).toBe('Load 129 / 120 lb · overloaded: no roll');
  });

  it('gives the weight of the chosen item, and of its stack', () => {
    expect(weightLine('chain-mail', 1)).toBe('Weight: 55 lb.');
    expect(weightLine('draught', 4)).toBe('Weight: 0.5 lb each, 2 lb in all.');
    expect(weightLine('ring', 2)).toBe('It weighs nothing.');
  });
});

describe('the detail of an item to wear', () => {
  it('says what the armour, the weapon and the magic do', () => {
    expect(wearLines('chain-mail', { class: 'fighter' })).toEqual([
      'Heavy armour: AC 16.',
      'Without STR 13, you walk slower in it.',
      'Noisy: when you sneak, the mobs see you from further away.',
    ]);
    expect(wearLines('longsword-plus-1', { class: 'fighter' })).toEqual([
      'Weapon: d8 damage + your attack ability.',
      'With both hands: d10.',
      'Magic: +1 to hit and damage.',
    ]);
    expect(wearLines('cloak-of-protection', { class: 'wizard' })).toEqual(['Magic: AC +1.', 'It needs attunement: you can be attuned to 3 things.']);
    expect(wearLines('bracers-of-defence', { class: 'monk' })[0]).toBe('Without armour and a shield: AC +2.');
    expect(wearLines('gauntlets-of-ogre-power', { class: 'fighter' })[0]).toBe('Your STR is 19 while you wear it, if it is lower.');
    expect(wearLines('belt-of-dwarvenkind', { class: 'fighter' })[0]).toBe('+2 CON while you wear it, at most 20.');
    expect(wearLines('boots-of-elvenkind', { class: 'rogue' })).toEqual(['Quiet steps: when you sneak, the mobs see you only from nearby.']);
    expect(wearLines('arcane-staff', { class: 'wizard' })).toContain('Your focus: you cast your cantrip with it.');
    expect(wearLines('arcane-staff', { class: 'fighter' })).not.toContain('Your focus: you cast your cantrip with it.');
    expect(wearLines('candle', { class: 'fighter' })).toEqual([]);
  });
});
