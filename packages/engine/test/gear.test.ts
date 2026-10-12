import { describe, expect, it } from 'vitest';
import {
  ATTACK_COOLDOWN_TICKS,
  CLASSES,
  EMPTY_GEAR,
  EMPTY_PACK,
  GEAR_BASE,
  GEAR_SLOTS,
  GLANCE_TICKS,
  Horde,
  ITEM_KINDS,
  MAX_ATTUNED,
  NO_INPUT,
  PLAIN_SCORES,
  PLAYER_SPEED,
  Room,
  SNEAK_ATTACK,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  WEARABLES,
  armourClass,
  AVERAGE_DICE,
  MOB_STATS,
  canUse,
  checkGear,
  createPlayer,
  dropWorn,
  fitsSlot,
  fromWireGear,
  gearAddress,
  dice,
  formatDice,
  rollBlow,
  type DiceSource,
  kitOf,
  meetsGate,
  moveItem,
  parseClientMessage,
  sightOf,
  stepPlayer,
  takeOffSlotFor,
  toWireGear,
  traitsOf,
  wear,
  wearProblem,
  wearSlotFor,
  type Gear,
  type ItemKind,
  type MobRules,
  type Pack,
  type Scores,
  type SnapshotMessage,
  ATTACK_REACH,
  REACH_BONUS,
  Remotes,
  fromWireLook,
  toWireLook,
  shownGear,
} from '../src/index.ts';
import { textSource } from './helpers.ts';

const scores = (over: Partial<Scores> = {}): Scores => ({ ...PLAIN_SCORES, ...over });
const gear = (worn: Partial<Record<keyof Gear, ItemKind>>): Gear => ({ ...EMPTY_GEAR, ...worn });
const pack = (...items: (ItemKind | null)[]): Pack => ({ coins: 0, items: items.map((kind) => (kind ? { kind, count: 1 } : null)) });

describe('the slots', () => {
  it('are the twelve of D&D 5e: head, neck, cloak, armour, bracers, gloves, belt, feet, two rings, two hands', () => {
    expect(GEAR_SLOTS).toHaveLength(12);
    expect(GEAR_SLOTS).toEqual(['head', 'neck', 'cloak', 'armour', 'bracers', 'gloves', 'belt', 'feet', 'ring-left', 'ring-right', 'main', 'off']);
  });

  it('take only the items that fit them', () => {
    expect(fitsSlot('chain-mail', 'armour')).toBe(true);
    expect(fitsSlot('chain-mail', 'head')).toBe(false);
    expect(fitsSlot('ring', 'ring-left')).toBe(true);
    expect(fitsSlot('ring', 'ring-right')).toBe(true);
    expect(fitsSlot('shield', 'off')).toBe(true);
    expect(fitsSlot('shield', 'main')).toBe(false);
    // The off hand holds a light weapon, never another one.
    expect(fitsSlot('shortsword', 'off')).toBe(true);
    expect(fitsSlot('longsword', 'off')).toBe(false);
    expect(fitsSlot('luck-amulet', 'neck')).toBe(true);
    expect(fitsSlot('imp-horn', 'neck')).toBe(false);
  });

  it('have a wearable for each new kind of item, and those stack one in a slot', () => {
    for (const kind of Object.keys(WEARABLES) as ItemKind[]) expect(ITEM_KINDS).toContain(kind);
    expect(WEARABLES['imp-horn']).toBeUndefined();
  });
});

describe('the proficiencies of the classes (SRD 5.1)', () => {
  it('let a fighter use everything, and a wizard no armour and no sword', () => {
    for (const kind of ['chain-mail', 'splint-armour', 'shield', 'longsword', 'greataxe', 'longbow'] as const) expect(canUse('fighter', kind)).toBe(true);
    expect(canUse('wizard', 'leather-armour')).toBe(false);
    expect(canUse('wizard', 'longsword')).toBe(false);
    expect(canUse('wizard', 'arcane-staff')).toBe(true);
  });

  it('give a rogue light armour and its few martial weapons, and no shield', () => {
    expect(canUse('rogue', 'leather-armour')).toBe(true);
    expect(canUse('rogue', 'scale-mail')).toBe(false);
    expect(canUse('rogue', 'rapier')).toBe(true);
    expect(canUse('rogue', 'greataxe')).toBe(false);
    expect(canUse('rogue', 'shield')).toBe(false);
  });

  it('let every class wear a ring and the luck amulet', () => {
    for (const cls of CLASSES) {
      expect(canUse(cls, 'ring')).toBe(true);
      expect(canUse(cls, 'luck-amulet')).toBe(true);
    }
  });
});

describe('the kits of the classes', () => {
  it('can be worn by their class', () => {
    for (const cls of CLASSES) {
      const kit = kitOf(cls);
      for (const slot of GEAR_SLOTS) {
        const kind = kit[slot];
        if (kind === null) continue;
        expect(fitsSlot(kind, slot)).toBe(true);
        expect(canUse(cls, kind)).toBe(true);
      }
      expect(checkGear(kit)).toEqual(kit);
    }
  });

  it('give a fighter chain mail, a longsword and a shield, whatever its scores', () => {
    expect(kitOf('fighter')).toEqual(gear({ armour: 'chain-mail', main: 'longsword', off: 'shield' }));
  });

  it('give the balance of the plan (main score 17, DEX 14, the third score 14)', () => {
    // At level 3 (level-3.md): the attack bonus is +2 and the modifier; the damage is the die and the modifier.
    const row = (cls: (typeof CLASSES)[number], over: Partial<Scores>) => {
      const s = scores(over);
      const t = traitsOf(s, cls, kitOf(cls));
      return { ac: t.ac, toHit: t.toHit, damage: formatDice(t.damage), cooldown: t.cooldown, ranged: t.ranged };
    };
    const quick = ATTACK_COOLDOWN_TICKS - 4;
    expect(row('barbarian', { str: 17, dex: 14, con: 14 })).toEqual({ ac: 14, toHit: 5, damage: '1d12+3', cooldown: quick + 4, ranged: false });
    expect(row('bard', { cha: 17, dex: 14 })).toEqual({ ac: 13, toHit: 4, damage: '1d8+2', cooldown: quick, ranged: false });
    expect(row('cleric', { wis: 17, dex: 14 })).toEqual({ ac: 18, toHit: 5, damage: '1d6+3', cooldown: quick, ranged: false });
    expect(row('druid', { wis: 17, dex: 14 })).toEqual({ ac: 15, toHit: 5, damage: '1d8+3', cooldown: quick, ranged: false });
    expect(row('fighter', { str: 17, dex: 14 })).toEqual({ ac: 18, toHit: 5, damage: '1d8+3', cooldown: quick, ranged: false });
    expect(row('monk', { dex: 17, wis: 14 })).toEqual({ ac: 15, toHit: 5, damage: '1d4+3', cooldown: ATTACK_COOLDOWN_TICKS - 6 - 2, ranged: false });
    expect(row('paladin', { str: 17, dex: 14 })).toEqual({ ac: 18, toHit: 5, damage: '1d8+3', cooldown: quick, ranged: false });
    expect(row('ranger', { dex: 17 })).toEqual({ ac: 14, toHit: 5, damage: '1d8+3', cooldown: ATTACK_COOLDOWN_TICKS - 6, ranged: true });
    expect(row('rogue', { dex: 17 })).toEqual({ ac: 14, toHit: 5, damage: '1d6+3', cooldown: ATTACK_COOLDOWN_TICKS - 6 - 2, ranged: false });
    expect(row('sorcerer', { cha: 17, dex: 14 })).toEqual({ ac: 12, toHit: 5, damage: '1d10+3', cooldown: quick, ranged: false });
    expect(row('warlock', { cha: 17, dex: 14 })).toEqual({ ac: 13, toHit: 5, damage: '1d10+3', cooldown: quick, ranged: false });
    expect(row('wizard', { int: 17, dex: 14 })).toEqual({ ac: 12, toHit: 5, damage: '1d10+3', cooldown: quick, ranged: false });
  });
});

describe('Armour Class', () => {
  it('is 10 + DEX without armour; a barbarian adds CON, a monk without a shield WIS', () => {
    expect(armourClass(EMPTY_GEAR, scores({ dex: 14 }), 'wizard')).toBe(12);
    expect(armourClass(EMPTY_GEAR, scores({ dex: 14, con: 16 }), 'barbarian')).toBe(15);
    expect(armourClass(EMPTY_GEAR, scores({ dex: 16, wis: 14 }), 'monk')).toBe(15);
    expect(armourClass(gear({ off: 'shield' }), scores({ dex: 16, wis: 14 }), 'monk')).toBe(15);
  });

  it('follows the armour: light + DEX, medium + DEX up to 2, heavy without DEX; a shield adds 2', () => {
    const dex = scores({ dex: 18 });
    expect(armourClass(gear({ armour: 'leather-armour' }), dex, 'fighter')).toBe(15);
    expect(armourClass(gear({ armour: 'scale-mail' }), dex, 'fighter')).toBe(16);
    expect(armourClass(gear({ armour: 'chain-mail' }), dex, 'fighter')).toBe(16);
    expect(armourClass(gear({ armour: 'splint-armour', off: 'shield' }), scores({ dex: 8 }), 'fighter')).toBe(19);
  });

});

/** A dice source that always rolls the same share of each die: 0 is a natural 1, 0.999 a natural 20. */
const fixed = (share: number): DiceSource => ({ kind: 'roll', random: () => share });

describe("a mob's attack roll (level-3.md)", () => {
  const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
  /** An imp next to a player with this AC, and the dice; the attacks of 20 s. */
  const fight = (ac: number, source: DiceSource) => {
    const horde = new Horde(new World(textSource([])), everywhere, 5, source);
    horde.spawn('imp', 8, 12);
    const player = createPlayer(8 + 2 * TILE_SIZE, 12);
    player.hp = 1000;
    const attacks: [number, number, number][] = [];
    for (let t = 0; t < 20_000 && attacks.length < 4; t += TICK_SECONDS * 1000) {
      stepPlayer(player, NO_INPUT, horde.world);
      player.poison = 0;
      attacks.push(...horde.step(TICK_SECONDS * 1000, [{ id: 1, state: player, traits: { ac } }]));
    }
    return { player, attacks };
  };

  it('glances off on a miss (a natural 1): no damage, no stun, a spark', () => {
    const { player, attacks } = fight(10, fixed(0));
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks.every(([, , damage]) => damage === 0)).toBe(true);
    expect(player.hp).toBe(1000);
    expect(player.glance).toBeGreaterThan(0);
    expect(player.glance).toBeLessThanOrEqual(GLANCE_TICKS);
  });

  it('hits with a natural 20 whatever the AC, and rolls the dice twice', () => {
    const { player, attacks } = fight(30, fixed(0.999));
    // The imp's claws: 1d4+3; a critical hit: 2d4+3, all fours.
    expect(attacks[0]![2]).toBe(4 + 4 + 3);
    expect(player.hp).toBeLessThan(1000);
  });

  it('hits when d20 + the bonus reaches the AC: an imp (+4) with a 10 hits AC 14, not AC 15', () => {
    // A share of 0.45 rolls a 10 on the d20, and 2 on the d4.
    expect(fight(14, fixed(0.45)).attacks.every(([, , damage]) => damage > 0)).toBe(true);
    expect(fight(15, fixed(0.45)).attacks.every(([, , damage]) => damage === 0)).toBe(true);
    expect(MOB_STATS.imp.toHit).toBe(4);
  });
});

describe('the damage with the gear', () => {
  it('comes from the die of the weapon: d8, d6, d12, a versatile weapon with an empty off hand its bigger die', () => {
    const s = scores({ str: 10 });
    const of = (g: Gear) => formatDice(traitsOf(s, 'fighter', g).damage);
    expect(of(gear({ main: 'longsword', off: 'shield' }))).toBe('1d8');
    expect(of(gear({ main: 'longsword' }))).toBe('1d10');
    expect(of(gear({ main: 'mace' }))).toBe('1d6');
    expect(of(gear({ main: 'greataxe' }))).toBe('1d12');
  });

  it('is an unarmed strike without a weapon (1), martial arts for a monk (1d4), a cantrip for a caster (level 3)', () => {
    const s = scores();
    const of = (cls: (typeof CLASSES)[number], g: Gear) => formatDice(traitsOf(s, cls, g).damage);
    expect(of('fighter', EMPTY_GEAR)).toBe('1');
    expect(of('monk', EMPTY_GEAR)).toBe('1d4');
    expect(of('sorcerer', EMPTY_GEAR)).toBe('1d10');
    expect(traitsOf(s, 'wizard', gear({ main: 'arcane-staff' })).strike.kind).toBe('cantrip');
    expect(of('druid', gear({ main: 'druid-staff' }))).toBe('1d8');
    // Another focus is a quarterstaff for it: a d6, a d8 with both hands.
    expect(traitsOf(s, 'druid', gear({ main: 'arcane-staff' })).strike.kind).toBe('weapon');
    expect(of('druid', gear({ main: 'arcane-staff' }))).toBe('1d8');
    expect(of('druid', gear({ main: 'arcane-staff', off: 'shield' }))).toBe('1d6');
  });

  it('comes quicker with a light weapon, slower with a heavy melee weapon, as now with a bow', () => {
    const s = scores();
    expect(traitsOf(s, 'rogue', gear({ main: 'shortsword' })).cooldown).toBe(ATTACK_COOLDOWN_TICKS - 2);
    expect(traitsOf(s, 'rogue', gear({ main: 'shortsword', off: 'shortsword' })).cooldown).toBe(ATTACK_COOLDOWN_TICKS - 4);
    expect(traitsOf(s, 'barbarian', gear({ main: 'greataxe' })).cooldown).toBe(ATTACK_COOLDOWN_TICKS + 4);
    expect(traitsOf(s, 'ranger', gear({ main: 'longbow' })).cooldown).toBe(ATTACK_COOLDOWN_TICKS);
  });

  it('makes any class with a bow shoot, and a ranger without one strike', () => {
    expect(traitsOf(scores(), 'fighter', gear({ main: 'longbow' })).ranged).toBe(true);
    expect(traitsOf(scores(), 'ranger', gear({ main: 'longsword' })).ranged).toBe(false);
  });

  it("adds a rogue's sneak attack on a mob that does not hunt it", () => {
    const rogue = traitsOf(scores({ dex: 16 }), 'rogue', gear({ main: 'shortsword' }));
    expect(rogue.sneak).toBe(SNEAK_ATTACK);
    expect(formatDice(SNEAK_ATTACK)).toBe('1d6');
    // With the average of the dice: 1d6+3 is 6, and the sneak attack (1d6 at level 1) adds 3.
    expect(rollBlow(rogue, { kind: 'imp', state: 'walk' }, true, AVERAGE_DICE).damage).toBe(6 + 3);
    expect(rollBlow(rogue, { kind: 'imp', state: 'chase' }, false, AVERAGE_DICE).damage).toBe(6);
    expect(traitsOf(scores(), 'fighter', EMPTY_GEAR).sneak.count).toBe(0);
  });

  it('gives the sneak attack in a fight: on a mob that does not hunt the rogue only', () => {
    const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
    const horde = new Horde(new World(textSource([])), everywhere, 5, AVERAGE_DICE);
    const brute = horde.spawn('brute', 40, 12);
    const rogue = traitsOf(scores({ dex: 10 }), 'rogue', gear({ main: 'shortsword' }));
    // The brute wanders: it does not hunt the rogue. 1d6 (3) + the sneak attack, 1d6 (3).
    horde.strike({ x: 20, y: 12 }, 0, undefined, 7, rogue);
    expect(brute.health).toBe(MOB_STATS.brute.health - 6);
    // Now it hunts the rogue (a blow turns it on the attacker): 3.
    horde.strike({ x: brute.x - 20, y: brute.y }, 0, undefined, 7, rogue);
    expect(brute.health).toBe(MOB_STATS.brute.health - 6 - 3);
  });
});

describe('the armour on the walk and on sneaking', () => {
  it('slows a character without the Strength of a heavy armour to 3/4', () => {
    expect(traitsOf(scores({ str: 12 }), 'fighter', gear({ armour: 'chain-mail' })).speed).toBe(0.75);
    expect(traitsOf(scores({ str: 13 }), 'fighter', gear({ armour: 'chain-mail' })).speed).toBe(1);
    expect(traitsOf(scores({ str: 14 }), 'fighter', gear({ armour: 'splint-armour' })).speed).toBe(0.75);
    const world = new World(textSource([]));
    const p = createPlayer(100, 100);
    stepPlayer(p, { x: 1, y: 0 }, world, traitsOf(scores({ str: 12 }), 'fighter', gear({ armour: 'chain-mail' })));
    expect(p.vx).toBeCloseTo(PLAYER_SPEED * 0.75);
  });

  it('lets mobs see a sneaking character from 3/4 of their sight in a noisy armour, not 1/2', () => {
    const still = createPlayer(0, 0);
    expect(sightOf(traitsOf(scores(), 'fighter', gear({ armour: 'leather-armour' })), still)).toBeCloseTo(0.5);
    expect(sightOf(traitsOf(scores(), 'fighter', gear({ armour: 'chain-mail' })), still)).toBeCloseTo(0.75);
  });
});

describe('the luck amulet', () => {
  it('adds 1 to each score for the gates, needs attunement, and changes no scale', () => {
    const plain = traitsOf(scores({ int: 12 }), 'wizard', EMPTY_GEAR);
    const lucky = traitsOf(scores({ int: 12 }), 'wizard', gear({ neck: 'luck-amulet' }));
    expect(meetsGate(plain.scores, { ability: 'int', min: 13 })).toBe(false);
    expect(meetsGate(lucky.scores, { ability: 'int', min: 13 })).toBe(true);
    expect(lucky.luck).toBe(1);
    expect(lucky.damage).toEqual(plain.damage);
    expect(lucky.toHit).toBe(plain.toHit);
    expect(WEARABLES['luck-amulet']!.attune).toBe(true);
  });
});

describe('putting on and taking off', () => {
  it('moves an item from the pack onto its slot, and what was worn there into the pack', () => {
    const before = { pack: pack('splint-armour'), gear: gear({ armour: 'chain-mail' }) };
    const after = wear(before, 0, 'armour', 6, 'fighter');
    expect(after).toEqual({ pack: pack('chain-mail'), gear: gear({ armour: 'splint-armour' }) });
  });

  it('refuses an item that the class cannot use, or that does not fit the slot', () => {
    expect(wear({ pack: pack('chain-mail'), gear: EMPTY_GEAR }, 0, 'armour', 6, 'wizard')).toBe('class');
    expect(wear({ pack: pack('chain-mail'), gear: EMPTY_GEAR }, 0, 'head', 6, 'fighter')).toBe('slot');
  });

  it('follows the hands: a two-handed weapon takes the shield off, a shield takes the two-handed weapon off', () => {
    const shielded = { pack: pack('greataxe'), gear: gear({ main: 'longsword', off: 'shield' }) };
    const axe = wear(shielded, 0, 'main', 6, 'fighter');
    expect(axe).toEqual({ pack: pack('longsword', 'shield'), gear: gear({ main: 'greataxe' }) });
    const back = wear({ pack: pack('shield'), gear: gear({ main: 'greataxe' }) }, 0, 'off', 6, 'fighter');
    expect(back).toEqual({ pack: pack('greataxe'), gear: gear({ off: 'shield' }) });
  });

  it('refuses when the pack has no room for what comes off', () => {
    const full = { pack: pack('greataxe', 'candle'), gear: gear({ main: 'longsword', off: 'shield' }) };
    expect(wear(full, 0, 'main', 2, 'fighter')).toBe('full');
  });

  it('takes a ring from a stack, and keeps the rest of the stack', () => {
    const rings = { pack: { coins: 0, items: [{ kind: 'ring' as const, count: 3 }] }, gear: EMPTY_GEAR };
    const after = wear(rings, 0, 'ring-left', 6, 'bard');
    expect(after).toEqual({ pack: { coins: 0, items: [{ kind: 'ring', count: 2 }] }, gear: gear({ 'ring-left': 'ring' }) });
  });

  it('allows at most three attuned items', () => {
    expect(MAX_ATTUNED).toBe(3);
    expect(wearProblem(gear({}), 'luck-amulet', 'neck', 'bard')).toBeNull();
    expect(wearProblem(gear({}), 'longsword', 'neck', 'bard')).toBe('slot');
  });

  it('takes an item off into a slot of the pack, or swaps it with an item there that fits', () => {
    const worn = { pack: pack(null, 'scale-mail'), gear: gear({ armour: 'chain-mail' }) };
    expect(moveItem(worn, gearAddress('armour'), 0, 6, 'fighter')).toEqual({ pack: pack('chain-mail', 'scale-mail'), gear: EMPTY_GEAR });
    expect(moveItem(worn, gearAddress('armour'), 1, 6, 'fighter')).toEqual({ pack: pack(null, 'chain-mail'), gear: gear({ armour: 'scale-mail' }) });
    // An item that does not fit the slot stays: nothing moves.
    expect(moveItem({ pack: pack('candle'), gear: gear({ armour: 'chain-mail' }) }, gearAddress('armour'), 0, 6, 'fighter')).toBeNull();
  });

  it('moves a ring from one hand to the other, and moves stacks in the pack as before', () => {
    const one = { pack: EMPTY_PACK, gear: gear({ 'ring-left': 'ring' }) };
    expect(moveItem(one, gearAddress('ring-left'), gearAddress('ring-right'), 6, 'bard')!.gear).toEqual(gear({ 'ring-right': 'ring' }));
    expect(moveItem({ pack: pack('candle'), gear: EMPTY_GEAR }, 0, 3, 6, 'bard')!.pack).toEqual(pack(null, null, null, 'candle'));
  });

  it('finds the slot for "Wear" and the pack slot for "Take off"', () => {
    expect(wearSlotFor(EMPTY_GEAR, 'ring')).toBe('ring-left');
    expect(wearSlotFor(gear({ 'ring-left': 'ring' }), 'ring')).toBe('ring-right');
    expect(wearSlotFor(EMPTY_GEAR, 'shortsword')).toBe('main');
    expect(wearSlotFor(EMPTY_GEAR, 'shield')).toBe('off');
    expect(wearSlotFor(EMPTY_GEAR, 'candle')).toBeNull();
    expect(takeOffSlotFor(pack('candle', null, 'cup'), 'mace', 6)).toBe(1);
    expect(takeOffSlotFor(pack('candle', 'cup'), 'mace', 2)).toBeNull();
    expect(dropWorn(gear({ main: 'mace' }), 'main', 'mace')).toEqual(EMPTY_GEAR);
    expect(dropWorn(gear({ main: 'mace' }), 'main', 'rapier')).toBeNull();
  });
});

describe('gear from outside', () => {
  it('is checked: known kinds in slots that fit them, no off hand with a two-handed weapon', () => {
    expect(checkGear({ armour: 'chain-mail', main: 'longsword' })).toEqual(gear({ armour: 'chain-mail', main: 'longsword' }));
    expect(checkGear({ armour: 'longsword' })).toBeNull();
    expect(checkGear({ main: 'greataxe', off: 'shield' })).toBeNull();
    expect(checkGear({ head: 'nothing' })).toBeNull();
    expect(checkGear(null)).toBeNull();
    expect(checkGear([])).toBeNull();
  });

  it('goes on the wire as a code for each slot, and back', () => {
    const g = gear({ armour: 'chain-mail', main: 'longsword', off: 'shield', 'ring-right': 'ring' });
    expect(fromWireGear(toWireGear(g))).toEqual(g);
    expect(toWireGear(EMPTY_GEAR)).toEqual(new Array(12).fill(-1));
  });

  it('comes in the messages move and put as an address of a worn slot', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'move', from: 0, to: GEAR_BASE + 3 }))).toEqual({ t: 'move', from: 0, to: GEAR_BASE + 3 });
    expect(parseClientMessage(JSON.stringify({ t: 'move', from: 0, to: GEAR_BASE + 12 }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'put', slot: GEAR_BASE + 10, kind: ITEM_KINDS.indexOf('mace'), count: 1 }))).not.toBeNull();
  });
});

describe('the gear in a shared world', () => {
  it('starts with the gear of the character, follows a move, changes the traits, and goes into the snapshot', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const s = scores({ str: 16 });
    const kit = kitOf('fighter');
    const p = room.join(0, 1, [5, 5], '', undefined, {
      traits: traitsOf(s, 'fighter', kit),
      traitsFor: (g) => traitsOf(s, 'fighter', g),
      pack: pack('greataxe'),
      gear: kit,
    })!;
    expect(room.welcome(p).gr).toEqual(toWireGear(kit));
    expect(p.traits.ac).toBe(18);
    room.move(p.id, 0, gearAddress('main'));
    expect(p.gear).toEqual(gear({ armour: 'chain-mail', main: 'greataxe' }));
    expect(p.pack).toEqual(pack('longsword', 'shield'));
    expect(p.traits.ac).toBe(16);
    expect(p.traits.damage).toEqual(dice(1, 12, 3));
    const snaps: SnapshotMessage[] = [];
    room.broadcast(0, (_, m) => snaps.push(m));
    expect(snaps[0]!.gr).toEqual(toWireGear(p.gear));
    expect(snaps[0]!.pk).toBeDefined();
  });

  it('drops a worn item on the ground with put, and the next snapshot has no gear when nothing changed', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const s = scores();
    const p = room.join(0, 1, [5, 5], '', undefined, { traits: traitsOf(s, 'cleric', kitOf('cleric')), traitsFor: (g) => traitsOf(s, 'cleric', g), gear: kitOf('cleric') })!;
    room.welcome(p);
    room.put(p.id, { slot: gearAddress('off'), kind: ITEM_KINDS.indexOf('shield'), count: 1 }, 0);
    expect(p.gear.off).toBeNull();
    expect(p.traits.ac).toBe(14);
    expect(room.piles.size).toBe(1);
    let snaps = 0;
    room.broadcast(0, (_, m) => {
      snaps++;
      expect(m.gr).toBeDefined();
    });
    room.broadcast(50, (_, m) => expect(m.gr).toBeUndefined());
    expect(snaps).toBe(1);
  });

  it('gives a guest the kit of the class of its look', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const p = room.join(0, 1, [5, 5])!;
    expect(GEAR_SLOTS.some((slot) => p.gear[slot] !== null) || p.traits.class === 'monk' || p.traits.class === 'sorcerer').toBe(true);
  });

  it('does not change while the character lies defeated', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const s = scores();
    const kit = kitOf('cleric');
    const p = room.join(0, 1, [5, 5], '', undefined, { traits: traitsOf(s, 'cleric', kit), traitsFor: (g) => traitsOf(s, 'cleric', g), gear: kit })!;
    p.state.down = 10;
    room.move(p.id, gearAddress('off'), 0);
    expect(p.gear).toEqual(kit);
  });

  it('sends what shows of every gear (the hands) when a player comes, and when that changes only', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const s = scores({ str: 16 });
    const join = (cls: 'fighter' | 'cleric', pack: Pack = EMPTY_PACK) =>
      room.join(0, 1, [5, 5], '', undefined, { traits: traitsOf(s, cls, kitOf(cls)), traitsFor: (g) => traitsOf(s, cls, g), gear: kitOf(cls), pack })!;
    const a = join('fighter', { coins: 0, items: [{ kind: 'greataxe', count: 1 }, { kind: 'ring', count: 1 }, { kind: 'leather-armour', count: 1 }] });
    const b = join('cleric');
    const snaps = new Map<number, SnapshotMessage>();
    const send = (ms: number) => {
      snaps.clear();
      room.broadcast(ms, (id, m) => snaps.set(id, m));
    };
    send(0);
    // The first snapshot of each has the looks of everyone.
    expect(new Map(snaps.get(b.id)!.lk)).toEqual(new Map([
      [a.id, toWireLook({ main: 'longsword', off: 'shield', armour: 'chain-mail' })],
      [b.id, toWireLook({ main: 'mace', off: 'shield', armour: 'scale-mail' })],
    ]));
    send(50);
    expect(snaps.get(b.id)!.lk).toBeUndefined();
    // A ring does not show: no looks.
    room.move(a.id, 1, gearAddress('ring-left'));
    send(100);
    expect(snaps.get(b.id)!.lk).toBeUndefined();
    // The armour shows (protocol 21).
    room.move(a.id, 2, gearAddress('armour'));
    expect(a.gear.armour).toBe('leather-armour');
    send(120);
    expect(fromWireLook(new Map(snaps.get(b.id)!.lk).get(a.id)!).armour).toBe('leather-armour');
    // A weapon in the hands shows: the others get the new look.
    room.move(a.id, 0, gearAddress('main'));
    send(150);
    const look = new Map(snaps.get(b.id)!.lk).get(a.id)!;
    expect(fromWireLook(look)).toEqual({ main: 'greataxe', off: null, armour: 'leather-armour' });
    expect(fromWireLook(look)).toEqual(shownGear(a.gear));
    // The client keeps it for each other player.
    const remotes = new Remotes();
    remotes.apply(snaps.get(b.id)!, 1000);
    expect(remotes.at(2000).find((p) => p.id === a.id)?.look).toEqual({ main: 'greataxe', off: null, armour: 'leather-armour' });
    room.leave(a.id);
    send(200);
    expect(new Map(snaps.get(b.id)!.lk).has(a.id)).toBe(false);
  });
});

describe('the magic items', () => {
  it('add AC: a cloak and a ring of protection +1 each; bracers of defence +2 without armour and a shield', () => {
    const s = scores({ dex: 10 });
    expect(armourClass(gear({ cloak: 'cloak-of-protection', 'ring-left': 'ring-of-protection' }), s, 'wizard')).toBe(12);
    expect(armourClass(gear({ bracers: 'bracers-of-defence' }), s, 'wizard')).toBe(12);
    expect(armourClass(gear({ bracers: 'bracers-of-defence', armour: 'leather-armour' }), s, 'fighter')).toBe(11);
    expect(armourClass(gear({ bracers: 'bracers-of-defence', off: 'shield' }), s, 'fighter')).toBe(12);
  });

  it('raise scores: gauntlets of ogre power STR 19, a headband of intellect INT 19, an amulet of health CON 19, a belt of dwarvenkind CON + 2', () => {
    const weak = scores({ str: 8, int: 8, con: 8 });
    const gauntlets = traitsOf(weak, 'fighter', gear({ main: 'rapier', gloves: 'gauntlets-of-ogre-power' }));
    expect(gauntlets.scores.str).toBe(19);
    expect(gauntlets.damage).toEqual(dice(1, 8, 4));
    expect(gauntlets.toHit).toBe(2 + 4);
    // A score that is higher already stays.
    expect(traitsOf(scores({ str: 20 }), 'fighter', gear({ gloves: 'gauntlets-of-ogre-power' })).scores.str).toBe(20);
    // With STR 19 the plate is not too heavy.
    expect(traitsOf(weak, 'fighter', gear({ armour: 'plate-armour', gloves: 'gauntlets-of-ogre-power' })).speed).toBe(1);
    const headband = traitsOf(weak, 'wizard', gear({ head: 'headband-of-intellect' }));
    expect(headband.scores.int).toBe(19);
    expect(headband.opening).toBe(4);
    // CON 19 (+4) for a wizard (d6) at level 1: 6 + 4.
    expect(traitsOf(weak, 'wizard', gear({ neck: 'amulet-of-health' })).maxHp).toBe(6 + 4);
    expect(traitsOf(scores({ con: 15 }), 'wizard', gear({ belt: 'belt-of-dwarvenkind' })).scores.con).toBe(17);
    expect(traitsOf(scores({ con: 19 }), 'wizard', gear({ belt: 'belt-of-dwarvenkind' })).scores.con).toBe(20);
  });

  it('give quiet steps: boots of elvenkind; with noisy armour they cancel out', () => {
    const still = createPlayer(0, 0);
    expect(sightOf(traitsOf(scores(), 'rogue', gear({ feet: 'boots-of-elvenkind' })), still)).toBeCloseTo(0.35);
    expect(sightOf(traitsOf(scores(), 'fighter', gear({ feet: 'boots-of-elvenkind', armour: 'chain-mail' })), still)).toBeCloseTo(0.5);
  });

  it('make a longsword +1 a longsword with 1 more damage, for every class that can use a longsword', () => {
    const s = scores();
    expect(traitsOf(s, 'fighter', gear({ main: 'longsword-plus-1', off: 'shield' })).damage).toEqual(dice(1, 8, 1));
    expect(traitsOf(s, 'fighter', gear({ main: 'longsword-plus-1', off: 'shield' })).toHit).toBe(2 + 1);
    expect(canUse('bard', 'longsword-plus-1')).toBe(true);
    expect(canUse('wizard', 'longsword-plus-1')).toBe(false);
  });

  it('need attunement, at most three', () => {
    const three = gear({ cloak: 'cloak-of-protection', 'ring-left': 'ring-of-protection', neck: 'amulet-of-health' });
    expect(wearProblem(three, 'headband-of-intellect', 'head', 'wizard')).toBe('attuned');
    expect(wear({ pack: pack('headband-of-intellect'), gear: three }, 0, 'head', 6, 'wizard')).toBe('attuned');
    // A fourth item without attunement goes on.
    expect(wearProblem(three, 'boots-of-elvenkind', 'feet', 'wizard')).toBeNull();
    // Another attuned item in the same slot takes the place of the first.
    expect(wearProblem(three, 'luck-amulet', 'neck', 'wizard')).toBeNull();
  });

  it('take their hit points with them when they come off, on the server', () => {
    const room = new Room(new World(textSource([])), { dice: AVERAGE_DICE });
    const s = scores({ con: 10 });
    const worn = gear({ neck: 'amulet-of-health' });
    const p = room.join(0, 1, [5, 5], '', undefined, { traits: traitsOf(s, 'wizard', worn), traitsFor: (g) => traitsOf(s, 'wizard', g), gear: worn })!;
    expect(p.state.hp).toBe(10);
    room.move(p.id, gearAddress('neck'), 0);
    expect(p.traits.maxHp).toBe(6);
    expect(p.state.hp).toBe(6);
  });
});

describe('a reach weapon', () => {
  it('hits REACH_BONUS further: a glaive, d10, heavy and two-handed', () => {
    const glaive = traitsOf(scores(), 'fighter', gear({ main: 'glaive' }));
    expect(glaive.reach).toBe(ATTACK_REACH + REACH_BONUS);
    expect(glaive.damage).toEqual(dice(1, 10));
    expect(glaive.cooldown).toBe(ATTACK_COOLDOWN_TICKS + 4);
    expect(traitsOf(scores(), 'fighter', gear({ main: 'longsword' })).reach).toBe(ATTACK_REACH);
    expect(wear({ pack: pack('glaive'), gear: gear({ main: 'mace', off: 'shield' }) }, 0, 'main', 6, 'fighter')).toEqual({
      pack: pack('mace', 'shield'),
      gear: gear({ main: 'glaive' }),
    });
  });

  it('strikes a mob a little further away, but not one at the far edge of the hounding', () => {
    const everywhere: MobRules = { roam: () => true, hunt: () => true, population: {} };
    const horde = new Horde(new World(textSource([])), everywhere, 5, AVERAGE_DICE);
    const imp = horde.spawn('imp', 100 + 33, 100);
    const sword = traitsOf(scores(), 'fighter', gear({ main: 'longsword' }));
    const glaive = traitsOf(scores(), 'fighter', gear({ main: 'glaive' }));
    // The imp's radius is 7: a sword reaches 29, a glaive 37.
    expect(horde.strike({ x: 100, y: 100 }, 0, undefined, 1, sword)).toEqual([]);
    expect(horde.strike({ x: 100, y: 100 }, 0, undefined, 1, glaive).map((r) => r.mob)).toEqual([imp]);
    const far = horde.spawn('imp', 100, 100 + 46);
    expect(horde.strike({ x: 100, y: 100 }, Math.PI / 2, undefined, 1, glaive)).toEqual([]);
    expect(far.health).toBe(MOB_STATS.imp.health);
  });
});

