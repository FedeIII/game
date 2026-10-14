import { describe, expect, it } from 'vitest';
import {
  ATTACK_TICKS,
  AVERAGE_DICE,
  BRACE_AC,
  BRACE_TICKS,
  BRACE_WINDOW_TICKS,
  EVADE_TICKS,
  Horde,
  NO_INPUT,
  PLAIN_GEAR,
  PLAIN_SCORES,
  PLAYER_SPEED,
  Prediction,
  STAMINA_REST_TICKS,
  Remotes,
  Room,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  armourNow,
  canAttack,
  canBeHit,
  createPlayer,
  kitOf,
  missPlayer,
  rollingDice,
  stepPlayer,
  traitsOf,
  type DiceSource,
  type HordePlayer,
  type MobRules,
  type MoveInput,
  type PlayerState,
  type Scores,
  type SnapshotMessage,
} from '../src/index.ts';
import { mobHouseSource, textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
/** A fighter with the plain gear: a melee attack, so a step back after it braces. AC 10, and 12 in a brace. */
const MELEE = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
/** Dice whose every die shows the same face: a d20 shows `natural`. */
const fixedDice = (natural: number): DiceSource => rollingDice(() => (natural - 0.5) / 20);
const everywhere: MobRules = { roam: () => true, hunt: () => true, population: { imp: 0, brute: 0 } };
const open = new World(textSource([]));
const EAST = 0;
const BACK: MoveInput = { x: -1, y: 0 };

/** A player with many hit points: these tests count hits, not defeats. */
function tough(x: number, y: number): PlayerState {
  const p = createPlayer(x, y);
  p.hp = 1000;
  return p;
}

type Traits = Parameters<typeof stepPlayer>[3];

/** An attack to the east, and the ticks of it until its end: then the brace window is open. */
function strike(p: PlayerState, world = open, traits: Traits = MELEE): void {
  expect(stepPlayer(p, { x: 0, y: 0, attack: EAST }, world, traits)).toBe(true);
  for (let i = 0; i < ATTACK_TICKS; i++) stepPlayer(p, NO_INPUT, world, traits);
  expect(p.attack).toBe(0);
}

describe('a brace', () => {
  it('starts with a step back right after a melee attack: the player stays and faces the way it struck while it holds the step back', () => {
    const p = createPlayer(100, 100);
    strike(p);
    expect(p.braceWindow).toBe(BRACE_WINDOW_TICKS);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBeGreaterThan(0);
    // Held three times as long as BRACE_TICKS, the brace goes on.
    for (let i = 1; i < 3 * BRACE_TICKS; i++) {
      stepPlayer(p, BACK, open, MELEE);
      expect(p.brace).toBeGreaterThan(0);
      expect(p.x).toBe(100);
      expect(p.facing).toBe('right');
    }
    // Let go after BRACE_TICKS: the brace ends at once.
    stepPlayer(p, NO_INPUT, open, MELEE);
    expect(p.brace).toBe(0);
    expect(p.x).toBe(100);
    // The brace is over: the step back is a walk again.
    stepPlayer(p, BACK, open, MELEE);
    expect(p.x).toBeCloseTo(100 - PLAYER_SPEED * TICK_SECONDS, 6);
    expect(p.facing).toBe('left');
  });

  it('lasts BRACE_TICKS from its start when the step back is let go sooner', () => {
    const p = createPlayer(100, 100);
    strike(p);
    stepPlayer(p, BACK, open, MELEE);
    for (let i = 1; i < BRACE_TICKS; i++) {
      expect(p.brace).toBeGreaterThan(0);
      stepPlayer(p, NO_INPUT, open, MELEE);
      expect(p.x).toBe(100);
    }
    expect(p.brace).toBe(0);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.x).toBeLessThan(100);
  });

  it('ends when the held move turns to the side, after BRACE_TICKS', () => {
    const p = createPlayer(100, 100);
    strike(p);
    for (let i = 0; i < BRACE_TICKS + 5; i++) stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBe(1);
    stepPlayer(p, { x: 0, y: 1 }, open, MELEE);
    expect(p.brace).toBe(0);
    stepPlayer(p, { x: 0, y: 1 }, open, MELEE);
    expect(p.y).toBeGreaterThan(100);
  });

  it('counts a step back at an angle, but not a step to the side, and not a step back after the window', () => {
    const angled = createPlayer(100, 100);
    strike(angled);
    stepPlayer(angled, { x: -0.7, y: 0.7 }, open, MELEE);
    expect(angled.brace).toBeGreaterThan(0);

    const side = createPlayer(100, 100);
    strike(side);
    stepPlayer(side, { x: 0, y: 1 }, open, MELEE);
    expect(side.brace).toBe(0);
    expect(side.y).toBeGreaterThan(100);

    // The old kite: a step back after the window walks away.
    const late = createPlayer(100, 100);
    strike(late);
    for (let i = 0; i < BRACE_WINDOW_TICKS; i++) stepPlayer(late, NO_INPUT, open, MELEE);
    stepPlayer(late, BACK, open, MELEE);
    expect(late.brace).toBe(0);
    expect(late.x).toBeLessThan(100);
  });

  it('does not start at the end of the attack when the step back was held into it', () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { ...BACK, attack: EAST }, open, MELEE);
    expect(p.heldBack).toBe(true);
    for (let i = 0; i < ATTACK_TICKS; i++) stepPlayer(p, BACK, open, MELEE);
    expect(p.braceWindow).toBe(BRACE_WINDOW_TICKS);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBe(0);
    // The held step back walks away: the kite.
    expect(p.x).toBeLessThan(100);
  });

  it('is only for a melee attack of a character: not after an arrow, not for a guard or a companion', () => {
    const ranger = traitsOf(PLAIN_SCORES, 'ranger', kitOf('ranger'));
    expect(ranger.brace).toBe(false);
    const archer = createPlayer(100, 100);
    strike(archer, open, ranger);
    stepPlayer(archer, BACK, open, ranger);
    expect(archer.brace).toBe(0);
    expect(archer.x).toBeLessThan(100);
    // The traits of a guard or a companion have no brace.
    const guard = createPlayer(100, 100);
    strike(guard, open, { maxHp: 11, recover: 0 });
    stepPlayer(guard, BACK, open, { maxHp: 11, recover: 0 });
    expect(guard.brace).toBe(0);
  });

  it('breaks for a roll, or for the next attack', () => {
    const rolls = createPlayer(100, 100);
    strike(rolls);
    stepPlayer(rolls, BACK, open, MELEE);
    stepPlayer(rolls, { ...BACK, dodge: true }, open, MELEE);
    expect(rolls.brace).toBe(0);
    expect(rolls.dodge).toBeGreaterThan(0);
    expect(rolls.x).toBeLessThan(100);

    const strikes = createPlayer(100, 100);
    strike(strikes);
    stepPlayer(strikes, BACK, open, MELEE);
    let started = false;
    for (let i = 0; i < BRACE_TICKS && !started; i++) started = stepPlayer(strikes, { ...BACK, attack: EAST }, open, MELEE);
    // The attack waits for its cooldown, and then it starts in the brace.
    expect(started).toBe(true);
    expect(strikes.brace).toBe(0);
    expect(strikes.attack).toBe(ATTACK_TICKS);
  });

  it('stops the refill of stamina while it lasts; stamina fills again a second after its end', () => {
    const p = createPlayer(100, 100);
    strike(p);
    const after = p.stamina;
    expect(after).toBe(MELEE.maxStamina - MELEE.attackStamina);
    // Held for three seconds: no stamina comes back.
    for (let i = 0; i < 3 * STAMINA_REST_TICKS; i++) stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBe(1);
    expect(p.stamina).toBe(after);
    // Let go: the brace ends, and stamina fills again after STAMINA_REST_TICKS.
    stepPlayer(p, NO_INPUT, open, MELEE);
    expect(p.brace).toBe(0);
    for (let i = 0; i < STAMINA_REST_TICKS; i++) stepPlayer(p, NO_INPUT, open, MELEE);
    expect(p.stamina).toBe(after);
    stepPlayer(p, NO_INPUT, open, MELEE);
    expect(p.stamina).toBeGreaterThan(after);
  });

  it('does not start in shallow water', () => {
    const water = new World(textSource([',,,,,,,,', ',,,,,,,,']));
    const p = createPlayer(4 * TILE_SIZE, 8);
    p.wading = true;
    // A wader cannot attack in water: give it the window by hand.
    p.braceWindow = BRACE_WINDOW_TICKS;
    p.aim = EAST;
    stepPlayer(p, BACK, water, { ...MELEE, wade: true });
    expect(p.brace).toBe(0);
  });
});

describe('a new step back for each brace', () => {
  it('braces after a release in the attack and a new press, in the attack or in the window', () => {
    // Held into the attack, let go in it, and pressed again in it.
    const again = createPlayer(100, 100);
    stepPlayer(again, { ...BACK, attack: EAST }, open, MELEE);
    for (let i = 0; i < 5; i++) stepPlayer(again, BACK, open, MELEE);
    stepPlayer(again, NO_INPUT, open, MELEE);
    expect(again.heldBack).toBe(false);
    for (let i = 6; i < ATTACK_TICKS; i++) stepPlayer(again, BACK, open, MELEE);
    stepPlayer(again, BACK, open, MELEE);
    expect(again.brace).toBeGreaterThan(0);
    expect(again.x).toBe(100);

    // Held through the attack, let go in the window, and pressed again in it.
    const late = createPlayer(100, 100);
    stepPlayer(late, { ...BACK, attack: EAST }, open, MELEE);
    for (let i = 0; i < ATTACK_TICKS; i++) stepPlayer(late, BACK, open, MELEE);
    stepPlayer(late, NO_INPUT, open, MELEE);
    stepPlayer(late, BACK, open, MELEE);
    expect(late.brace).toBeGreaterThan(0);
    expect(late.x).toBe(100);
  });

  it('counts a move to the side as a release', () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { ...BACK, attack: EAST }, open, MELEE);
    for (let i = 0; i < 4; i++) stepPlayer(p, BACK, open, MELEE);
    stepPlayer(p, { x: 0, y: 1 }, open, MELEE);
    expect(p.heldBack).toBe(false);
    for (let i = 5; i < ATTACK_TICKS; i++) stepPlayer(p, BACK, open, MELEE);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBeGreaterThan(0);
  });

  it('does not brace a player who holds the step back and attacks again and again', () => {
    const p = tough(400, 100);
    let attacks = 0;
    for (let tick = 0; tick < 10 * MELEE.cooldown; tick++) {
      if (stepPlayer(p, { ...BACK, attack: EAST }, open, MELEE)) attacks++;
      expect(p.brace).toBe(0);
    }
    expect(attacks).toBeGreaterThanOrEqual(9);
    // It walked back between the attacks: the kite.
    expect(p.x).toBeLessThan(400);
  });

  it('needs a new step back after a held brace: the next attack in it, with the step back held, does not brace again', () => {
    const p = createPlayer(100, 100);
    strike(p);
    for (let i = 0; i < BRACE_TICKS + 20; i++) stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBe(1);
    // The next attack, with the step back held: it breaks the brace, and no brace comes after it.
    expect(stepPlayer(p, { ...BACK, attack: EAST }, open, MELEE)).toBe(true);
    expect(p.brace).toBe(0);
    for (let i = 0; i < ATTACK_TICKS + BRACE_WINDOW_TICKS; i++) {
      stepPlayer(p, BACK, open, MELEE);
      expect(p.brace).toBe(0);
    }
  });
});

describe('a blow in a brace', () => {
  it('rolls against BRACE_AC + DEX more AC: a roll that hits the player out of a brace misses it in a brace', () => {
    // The brute (+5) rolls a natural 6: 11 hits AC 10, and misses AC 12.
    const braced = bruteFight(BACK, fixedDice(6));
    expect(braced.misses).toBe(1);
    expect(braced.hits).toBe(0);
    expect(braced.player.hp).toBe(1000);
    expect(braced.player.stun).toBe(0);
    // A miss in a brace is an evade, not a glance; the brace goes on while the step back is held.
    expect(braced.evaded).toBe(true);
    expect(braced.glanced).toBe(false);
    expect(braced.braceAfter).toBeGreaterThan(0);
    // It stood where it was.
    expect(braced.at).toEqual(braced.start);
    // As after a miss: the brute goes to the end of the line and chases, it does not run off.
    expect(braced.states.has('retreat')).toBe(false);
    expect(braced.states.has('chase')).toBe(true);

    const standing = bruteFight(NO_INPUT, fixedDice(6));
    expect(standing.hits).toBe(1);
    expect(standing.evaded).toBe(false);
    expect(standing.player.hp).toBeLessThan(1000);
  });

  it('is no sure evade: a roll that reaches the AC of the brace hits, stuns the player and ends the brace', () => {
    // AVERAGE_DICE: every attack hits.
    const fight = bruteFight(BACK, AVERAGE_DICE);
    expect(fight.hits).toBe(1);
    expect(fight.evaded).toBe(false);
    expect(fight.braceAfter).toBe(0);
    expect(fight.player.stun).toBeGreaterThan(0);
    expect(fight.player.hp).toBeLessThan(1000);
  });

  it('gives a brace AC of BRACE_AC + the DEX modifier, at least 1, and none to an archer', () => {
    const dex = (n: number) => traitsOf({ ...PLAIN_SCORES, dex: n } as Scores, 'fighter', PLAIN_GEAR).braceAc;
    expect(dex(10)).toBe(BRACE_AC);
    expect(dex(16)).toBe(BRACE_AC + 3);
    expect(dex(8)).toBe(BRACE_AC - 1);
    expect(dex(3)).toBe(1);
    expect(traitsOf(PLAIN_SCORES, 'ranger', kitOf('ranger')).braceAc).toBe(0);
  });
});

describe('an evade', () => {
  it('is only a look: a mob can still hit the player, it can still attack, and the evade ends with the brace', () => {
    const p = tough(100, 100);
    p.aim = EAST;
    p.brace = 5;
    missPlayer(p);
    expect(p.evade).toBe(EVADE_TICKS);
    expect(p.glance).toBe(0);
    expect(canBeHit(p)).toBe(true);
    expect(canAttack(p)).toBe(true);
    expect(armourNow(p, 10, 2)).toBe(12);
    for (let i = 0; i < 5; i++) stepPlayer(p, NO_INPUT, open, MELEE);
    expect(p.brace).toBe(0);
    expect(p.evade).toBe(0);
    expect(armourNow(p, 10, 2)).toBe(10);
    // Out of a brace a miss glances off.
    missPlayer(p);
    expect(p.evade).toBe(0);
    expect(p.glance).toBeGreaterThan(0);
  });
});

/**
 * A brute next to a player winds up; 15 ticks into its wind-up the player attacks, and misses (the
 * test does not give the blow to the horde). The attack ends just before the blow of the brute (650
 * ms: 39 ticks). Then the player holds `after`. It runs until the first blow of the brute is over.
 */
function bruteFight(after: MoveInput, dice: DiceSource) {
  const horde = new Horde(new World(textSource([])), everywhere, 2, dice);
  const p = tough(5 * TILE_SIZE, 5 * TILE_SIZE);
  const brute = horde.spawn('brute', p.x + 20, p.y);
  const player: HordePlayer = { id: 1, state: p, traits: MELEE };
  const start = { x: p.x, y: p.y };
  let windupAt = -1;
  let hits = 0;
  let misses = 0;
  let evaded = false;
  let glanced = false;
  let struck = false;
  let braceAfter = -1;
  const states = new Set<string>();
  for (let tick = 0; tick < 600; tick++) {
    if (windupAt < 0 && brute.state === 'windup') windupAt = tick;
    const since = windupAt < 0 ? -1 : tick - windupAt;
    const input: MoveInput = since === 15 ? { x: 0, y: 0, attack: EAST } : since > 15 ? after : NO_INPUT;
    stepPlayer(p, input, horde.world, MELEE);
    for (const [, , damage] of horde.step(TICK_MS, [player])) {
      if (damage > 0) hits++;
      else misses++;
      braceAfter = p.brace;
    }
    if (p.evade > 0) evaded = true;
    if (p.glance > 0) glanced = true;
    if (brute.state === 'strike') struck = true;
    if (struck) states.add(brute.state);
    if (struck && brute.state !== 'strike') break;
  }
  return { player: p, start, at: { x: p.x, y: p.y }, hits, misses, evaded, glanced, braceAfter, states };
}

describe('a brace in a shared world', () => {
  it('is predicted exactly on the page, and the others see it', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const joined = room.join(0, 1, [5, 10], '', undefined, { traits: MELEE })!;
    const other = room.join(0, 2, [8, 10])!;
    const world = new World(mobHouseSource());
    const prediction = new Prediction();
    prediction.traits = MELEE;
    const player = createPlayer(0, 0);
    prediction.reset(player, world, room.welcome(joined));
    // The step back is held past BRACE_TICKS: the brace stays at its last tick.
    const inputs: MoveInput[] = [{ x: 0, y: 0, attack: EAST }, ...Array.from({ length: ATTACK_TICKS + BRACE_TICKS + 10 }, () => BACK)];
    let seq = 1;
    for (const input of inputs) {
      prediction.step(player, world, input);
      const batch = prediction.takeBatch();
      if (batch) room.input(joined.id, batch, seq++ * 50);
    }
    let mine: SnapshotMessage | undefined;
    let theirs: SnapshotMessage | undefined;
    room.broadcast(0, (id, message) => {
      if (id === joined.id) mine = message;
      if (id === other.id) theirs = message;
    });
    const truth = joined.state;
    expect(truth.brace).toBe(1);
    const before = { x: player.x, brace: player.brace, window: player.braceWindow };
    const { dx, dy } = prediction.reconcile(player, world, mine!, []);
    expect(Math.hypot(dx, dy)).toBeLessThan(1e-9);
    expect({ x: player.x, brace: player.brace, window: player.braceWindow }).toEqual(before);
    const seen = theirs!.p.find((w) => w[0] === joined.id)!;
    expect(seen[14]).toBe(truth.brace);
    expect(seen[15]).toBe(0);
    // The others see a held brace as long as it holds: its ticks do not count down between snapshots.
    const remotes = new Remotes();
    remotes.apply(theirs!, 1000);
    expect(remotes.at(2000).find((r) => r.id === joined.id)!.brace).toBe(1);
  });

  it('predicts a step back held into the attack exactly: no brace on the server or on the page', () => {
    const room = new Room(new World(mobHouseSource()), { dice: AVERAGE_DICE });
    const joined = room.join(0, 1, [5, 10], '', undefined, { traits: MELEE })!;
    const world = new World(mobHouseSource());
    const prediction = new Prediction();
    prediction.traits = MELEE;
    const player = createPlayer(0, 0);
    prediction.reset(player, world, room.welcome(joined));
    const inputs: MoveInput[] = [{ ...BACK, attack: EAST }, ...Array.from({ length: ATTACK_TICKS - 3 }, () => BACK)];
    let seq = 1;
    for (const input of inputs) {
      prediction.step(player, world, input);
      const batch = prediction.takeBatch();
      if (batch) room.input(joined.id, batch, seq++ * 50);
    }
    let mine: SnapshotMessage | undefined;
    room.broadcast(0, (id, message) => {
      if (id === joined.id) mine = message;
    });
    const truth = joined.state;
    expect(truth.heldBack).toBe(true);
    expect(mine!.you[28]).toBe(1);
    const before = { x: player.x, held: player.heldBack, stamina: player.stamina };
    const { dx, dy } = prediction.reconcile(player, world, mine!, []);
    expect(Math.hypot(dx, dy)).toBeLessThan(1e-9);
    expect({ x: player.x, held: player.heldBack, stamina: player.stamina }).toEqual(before);
    // The rest of the attack and the window, with the step back still held: no brace.
    for (let i = 0; i < 3 + BRACE_WINDOW_TICKS; i++) prediction.step(player, world, BACK);
    expect(player.brace).toBe(0);
  });
});
