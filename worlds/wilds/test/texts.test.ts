import { describe, expect, it } from 'vitest';
import { DIALOG_LIMITS, type Dialog } from '@game/engine';
import { DEFAULT_SEED, TEXTS_ES, TOWN, WildsSource, wilds } from '../src/index.ts';
import { worldTexts } from './world-texts.ts';

describe('the texts of the Wilds in Spanish', () => {
  const english = worldTexts(wilds, new WildsSource(DEFAULT_SEED));

  it('translate every text of the content, and nothing else', () => {
    const missing = [...english].filter((text) => !(text in TEXTS_ES));
    expect(missing).toEqual([]);
    const stale = Object.keys(TEXTS_ES).filter((text) => !english.has(text));
    expect(stale).toEqual([]);
    expect(wilds.texts?.es).toBe(TEXTS_ES);
  });

  it('keep the mark of the name ({name}) where the English has it', () => {
    for (const [en, es] of Object.entries(TEXTS_ES)) expect(es.includes('{name}'), en).toBe(en.includes('{name}'));
  });

  it('fit the conversation panel', () => {
    const source = new WildsSource(DEFAULT_SEED);
    const dialogs: Dialog[] = [];
    for (const npc of source.npcs()) if (npc.content.dialog) dialogs.push(npc.content.dialog);
    for (const fixture of source.fixturesIn(TOWN.x0, TOWN.y0, TOWN.x1, TOWN.y1)) if (fixture.content?.dialog) dialogs.push(fixture.content.dialog);
    // Seven people of Ironhold, the cauldron, the merchant on the road, and three people of Silverspring.
    expect(dialogs.length).toBe(12);
    for (const dialog of dialogs) {
      expect(TEXTS_ES[dialog.name]!.length, dialog.name).toBeLessThanOrEqual(DIALOG_LIMITS.name);
      for (const node of Object.values(dialog.nodes)) {
        expect(TEXTS_ES[node.say]!.length, node.say).toBeLessThanOrEqual(DIALOG_LIMITS.say);
        for (const answer of node.answers) expect(TEXTS_ES[answer.text]!.length, answer.text).toBeLessThanOrEqual(DIALOG_LIMITS.answer);
      }
    }
  });

  it('call the town Ferrozar, and the reeve Elama Rothenel, la alguacil', () => {
    expect(TEXTS_ES.Ironhold).toBe('Ferrozar');
    expect(TEXTS_ES['Elama Rothenel, the reeve']).toBe('Elama Rothenel, la alguacil');
    expect(TEXTS_ES['The Crooked Lantern']).toBe('El Farol Torcido');
    expect(Object.values(TEXTS_ES).some((es) => /Ironhold|Thornwick/.test(es))).toBe(false);
  });
});
