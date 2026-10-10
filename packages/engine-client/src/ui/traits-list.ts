import { FORCE_GATE, WADE_GATE, meetsGate, type Gate, type PlayerTraits } from '@game/engine';
import { STRINGS } from './strings.ts';

/**
 * What the scores of a character give in the game (traits.ts), as a list of terms and values:
 * the character builder shows it under the scores, and the "You" section of the settings under
 * the character.
 */
export function traitsList(traits: PlayerTraits): HTMLElement {
  const t = STRINGS.traits;
  const gate = (gate: Gate, yes: string) => (meetsGate(traits.scores, gate) ? yes : t.from(STRINGS.abilities[gate.ability].short, gate.min));
  const rows: [string, string][] = [
    [t.damage, t.damageValue(traits.damage, STRINGS.abilities[traits.attack].short)],
    [t.push, t.share(traits.push)],
    [t.stagger, t.share(traits.stagger)],
    [t.slots, t.slotsValue(traits.slots)],
    [t.wade, gate(WADE_GATE, t.wadeYes)],
    [t.force, gate(FORCE_GATE, t.forceYes)],
  ];
  const list = document.createElement('dl');
  list.className = 'traits';
  for (const [term, value] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.append(dt, dd);
  }
  return list;
}
