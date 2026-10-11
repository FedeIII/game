import { describe, expect, it } from 'vitest';
import { wearLines } from './pack-panel.ts';

describe('the detail of an item to wear', () => {
  it('says what the armour, the weapon and the magic do', () => {
    expect(wearLines('chain-mail', { class: 'fighter' })).toEqual([
      'Heavy armour: AC 16.',
      'Without STR 13, you walk slower in it.',
      'Noisy: when you sneak, the mobs see you from further away.',
    ]);
    expect(wearLines('longsword-plus-1', { class: 'fighter' })).toEqual([
      'Weapon (d8): 4 damage + your attack ability.',
      'With both hands (d10): 5.',
      'Magic: +1 damage.',
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
