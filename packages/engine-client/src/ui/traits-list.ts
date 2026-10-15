import { ABILITIES, MEDICINE_GATE, TICK_SECONDS, TILE_SIZE, WADE_GATE, abilityModifier, formatDice, meetsGate, rollOf, type Ability, type Gate, type PlayerTraits } from '@game/engine';
import { HOMEWARD_GATE, READ_FOE_GATE, READ_OPENING_GATE, REPUTATION_GATE } from './gates.ts';
import { STRINGS } from './strings.ts';

/**
 * How a value shows: `better` and `worse` than for a score of 10 (a scale with the modifier above or
 * under 0, or a gate that the score passes: `better`), `plain` (as for a score of 10: dim) and
 * `closed` (a gate that the score does not pass: dim, with the gate).
 */
export type TraitTone = 'better' | 'plain' | 'worse' | 'closed';

export interface TraitRow {
  readonly term: string;
  readonly value: string;
  readonly tone: TraitTone;
}

/** One of the key numbers at the top: Armour Class, hit points, attack bonus, damage. */
export interface TraitKey {
  readonly term: string;
  readonly value: string;
  /** A short line under the value: the ability of the attacks, a sneak attack. */
  readonly note?: string;
  /** What the number means, for a mouse over it. */
  readonly title?: string;
}

/** What one ability gives: its score and modifier for the scales, and its rows. */
export interface TraitGroup {
  readonly ability: Ability;
  readonly score: number;
  readonly modifier: number;
  readonly rows: readonly TraitRow[];
}

export interface TraitSheet {
  readonly key: readonly TraitKey[];
  readonly groups: readonly TraitGroup[];
}

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`;

/**
 * What the scores and the gear of a character give in the game (traits.ts): the key numbers, and a
 * group for each ability with what it gives (Fede's choice of 2026-10-14: groups by ability). The
 * scales use the scores without the luck of the worn items, the gates the scores with it.
 */
export function traitSheet(traits: PlayerTraits): TraitSheet {
  const t = STRINGS.traits;
  const short = (ability: Ability) => STRINGS.abilities[ability].short;
  const key: TraitKey[] = [
    { term: t.ac, value: String(traits.ac) },
    { term: t.hp, value: String(traits.maxHp) },
    { term: t.toHit, value: signed(traits.toHit), note: t.attackWith(short(traits.attack)), title: t.toHitTitle(traits.toHit) },
    {
      term: t.damage,
      value: formatDice(traits.damage),
      ...(traits.sneak.count > 0 ? { note: t.sneakNote(formatDice(traits.sneak)), title: t.sneakTitle(formatDice(traits.sneak)) } : {}),
    },
  ];

  const groups = ABILITIES.map((ability): TraitGroup => {
    const score = traits.scores[ability] - traits.luck;
    const modifier = abilityModifier(score);
    return { ability, score, modifier, rows: groupRows(ability, modifier, traits) };
  });
  return { key, groups };
}

/** The rows of one ability: its scales (tone from its modifier) and its gates (from the scores with the luck). */
function groupRows(ability: Ability, modifier: number, traits: PlayerTraits): TraitRow[] {
  const t = STRINGS.traits;
  const short = (ability: Ability) => STRINGS.abilities[ability].short;
  const scale: TraitTone = modifier > 0 ? 'better' : modifier < 0 ? 'worse' : 'plain';
  // A bonus that a low score does not take away (the opening, the inspire).
  const bonus: TraitTone = modifier > 0 ? 'better' : 'plain';
  const row = (term: string, value: string, tone: TraitTone = scale): TraitRow => ({ term, value, tone });
  const gate = (term: string, gate: Gate, yes: string): TraitRow =>
    meetsGate(traits.scores, gate) ? row(term, yes, 'better') : row(term, t.from(short(gate.ability), gate.dc), 'closed');
  // The checks of the content (locks, boards, lore, insight, persuasion) each have their own DC: the
  // score (with the luck) is the highest DC that the character passes (docs/features/abilities/checks.md).
  const checks = (term: string): TraitRow => row(term, t.upTo(short(ability), traits.scores[ability]));
  switch (ability) {
    case 'str':
      return [
        ...(traits.speed < 1 ? [row(t.walk, t.walkValue(traits.speed), 'worse')] : []),
        row(t.push, t.share(traits.push)),
        row(t.stagger, t.share(traits.stagger)),
        row(t.slots, t.slotsValue(traits.slots)),
        row(t.carry, t.carryValue(traits.carry)),
        gate(t.wade, WADE_GATE, t.wadeYes),
        checks(t.force),
      ];
    case 'dex':
      return [
        row(t.attacks, t.attacksValue(traits.cooldown * TICK_SECONDS)),
        row(t.guard, t.seconds(traits.guard * TICK_SECONDS)),
        row(t.dodge, t.dodgeValue(traits.dodgeCooldown * TICK_SECONDS)),
        // The roll of a light load (load.ts): the pack panel shows the load of now.
        row(t.roll, t.rollValue(rollOf('light', traits).distance / TILE_SIZE, rollOf('light', traits).safe * TICK_SECONDS)),
        ...(traits.brace ? [row(t.brace, t.braceValue(traits.braceAc))] : []),
        row(t.sight, t.sightValue(traits.sight, traits.sight * traits.sneakSight)),
        ...(traits.ranged ? [row(t.range, t.rangeValue(traits.range / TILE_SIZE))] : []),
        checks(t.pick),
      ];
    case 'con':
      return [
        row(t.stun, t.share(traits.stun)),
        row(t.stamina, t.staminaValue(traits.maxStamina, traits.staminaRefill)),
        // The weapon decides it, not the score: plain.
        row(t.attackStamina, t.attackStaminaValue(traits.attackStamina), 'plain'),
        row(t.resist, t.share(traits.resist)),
      ];
    case 'int':
      return [
        row(t.opening, t.openingValue(traits.opening), bonus),
        meetsGate(traits.scores, READ_OPENING_GATE)
          ? row(t.readFoe, t.readFoeOpening, 'better')
          : meetsGate(traits.scores, READ_FOE_GATE)
            ? row(t.readFoe, t.readFoeHealth, 'better')
            : row(t.readFoe, t.from(short('int'), READ_FOE_GATE.dc), 'closed'),
        row(t.map, t.mapValue(traits.scores.int), traits.scores.int >= 11 ? 'better' : 'plain'),
        checks(t.lore),
      ];
    case 'wis':
      return [
        row(t.sense, t.tiles(traits.sense / TILE_SIZE)),
        row(t.seek, t.tiles(traits.seek / TILE_SIZE)),
        row(t.night, t.nightValue(traits.night)),
        checks(t.insight),
        gate(t.medicine, MEDICINE_GATE, t.medicineYes),
        gate(t.homeward, HOMEWARD_GATE, t.homewardYes),
      ];
    case 'cha':
      return [
        row(t.prices, t.pricesValue(traits.buyShare, traits.sellShare)),
        row(t.presence, t.presenceValue(traits.presence)),
        row(t.daunt, t.dauntValue(traits.daunt)),
        row(t.inspire, t.inspireValue(traits.inspire * TICK_SECONDS), bonus),
        checks(t.persuasion),
        gate(t.reputation, REPUTATION_GATE, t.reputationYes),
      ];
  }
}

/**
 * The traits as HTML: the key numbers in a row of tiles, then a card for each ability (two columns
 * on a wide screen). The character builder shows it under the scores (with the kit of the class),
 * and the character panel beside the character. `lit` makes the card of that ability glow once: the
 * builder gives the ability that the player changed.
 */
export function traitsList(traits: PlayerTraits, lit?: Ability): HTMLElement {
  const sheet = traitSheet(traits);
  const root = document.createElement('div');
  root.className = 'traits';

  const key = document.createElement('dl');
  key.className = 'traits-key';
  for (const item of sheet.key) {
    const tile = document.createElement('div');
    tile.className = 'traits-tile';
    if (item.title) tile.title = item.title;
    const dt = document.createElement('dt');
    dt.textContent = item.term;
    const dd = document.createElement('dd');
    dd.textContent = item.value;
    if (item.note) {
      const note = document.createElement('span');
      note.className = 'traits-note';
      note.textContent = item.note;
      dd.append(note);
    }
    tile.append(dt, dd);
    key.append(tile);
  }

  const groups = document.createElement('div');
  groups.className = 'traits-groups';
  for (const group of sheet.groups) {
    const card = document.createElement('section');
    card.className = group.ability === lit ? 'traits-group lit' : 'traits-group';
    card.dataset.ability = group.ability;
    const head = document.createElement('h3');
    head.className = 'traits-head';
    const name = document.createElement('span');
    name.textContent = STRINGS.abilities[group.ability].name;
    const score = document.createElement('span');
    score.className = 'traits-score';
    score.textContent = `${group.score} (${signed(group.modifier)})`;
    head.append(name, score);
    const rows = document.createElement('dl');
    rows.className = 'traits-rows';
    for (const row of group.rows) {
      const dt = document.createElement('dt');
      dt.textContent = row.term;
      const dd = document.createElement('dd');
      dd.textContent = row.value;
      // The tone on both: a closed gate dims the whole row, the other tones only the value.
      dt.className = dd.className = row.tone;
      rows.append(dt, dd);
    }
    card.append(head, rows);
    groups.append(card);
  }

  root.append(key, groups);
  return root;
}
