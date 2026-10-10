import { FORCE_GATE, PICK_GATE, SNEAK_SIGHT, TICK_SECONDS, TILE_SIZE, WADE_GATE, meetsGate, type Gate, type PlayerTraits } from '@game/engine';
import { LORE_GATE, READ_FOE_GATE, READ_OPENING_GATE } from './gates.ts';
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
    [t.attacks, t.attacksValue(traits.cooldown * TICK_SECONDS)],
    [t.guard, t.seconds(traits.guard * TICK_SECONDS)],
    [t.dodge, t.dodgeValue(traits.dodgeCooldown * TICK_SECONDS)],
    [t.sight, t.sightValue(traits.sight, traits.sight * SNEAK_SIGHT)],
    ...(traits.ranged ? ([[t.range, t.rangeValue(traits.range / TILE_SIZE)]] as [string, string][]) : []),
    [t.pick, gate(PICK_GATE, t.pickYes)],
    [t.hp, String(traits.maxHp)],
    [t.stun, t.share(traits.stun)],
    [t.recover, t.recoverValue(traits.recover * TICK_SECONDS)],
    [t.stamina, t.staminaValue(traits.maxStamina, traits.staminaRefill)],
    [t.resist, t.share(traits.resist)],
    [t.opening, t.openingValue(traits.opening)],
    [t.readFoe, meetsGate(traits.scores, READ_OPENING_GATE) ? t.readFoeOpening : meetsGate(traits.scores, READ_FOE_GATE) ? t.readFoeHealth : t.from(STRINGS.abilities.int.short, READ_FOE_GATE.min)],
    [t.map, t.mapValue(traits.scores.int)],
    [t.lore, gate(LORE_GATE, t.loreYes)],
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
