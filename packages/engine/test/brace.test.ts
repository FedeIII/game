import { describe, expect, it } from 'vitest';
import {
  ATTACK_TICKS,
  AVERAGE_DICE,
  BRACE_TICKS,
  BRACE_WINDOW_TICKS,
  EVADE_TICKS,
  Horde,
  NO_INPUT,
  PLAIN_GEAR,
  PLAIN_SCORES,
  PLAYER_SPEED,
  Prediction,
  Room,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  canBeHit,
  createPlayer,
  evadeBlow,
  kitOf,
  stepPlayer,
  traitsOf,
  type HordePlayer,
  type MobRules,
  type MoveInput,
  type PlayerState,
  type SnapshotMessage,
} from '../src/index.ts';
import { mobHouseSource, textSource } from './helpers.ts';

const TICK_MS = TICK_SECONDS * 1000;
/** A fighter with the plain gear: a melee attack, so a step back after it braces. */
const MELEE = traitsOf(PLAIN_SCORES, 'fighter', PLAIN_GEAR);
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
  it('starts with a step back right after a melee attack: the player stays, faces the way it struck, and walks again after BRACE_TICKS', () => {
    const p = createPlayer(100, 100);
    strike(p);
    expect(p.braceWindow).toBe(BRACE_WINDOW_TICKS);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBeGreaterThan(0);
    for (let i = 1; i < BRACE_TICKS; i++) {
      stepPlayer(p, BACK, open, MELEE);
      expect(p.x).toBe(100);
      expect(p.facing).toBe('right');
    }
    expect(p.brace).toBe(0);
    // The brace is over: the step back is a walk again.
    stepPlayer(p, BACK, open, MELEE);
    expect(p.x).toBeCloseTo(100 - PLAYER_SPEED * TICK_SECONDS, 6);
    expect(p.facing).toBe('left');
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

  it('starts at the end of the attack when the step back was held through it', () => {
    const p = createPlayer(100, 100);
    stepPlayer(p, { ...BACK, attack: EAST }, open, MELEE);
    for (let i = 0; i < ATTACK_TICKS; i++) stepPlayer(p, BACK, open, MELEE);
    stepPlayer(p, BACK, open, MELEE);
    expect(p.brace).toBeGreaterThan(0);
    expect(p.x).toBe(100);
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

describe('an evade', () => {
  it('takes a blow on a player that braces: no roll, no move, and no mob can hit it for EVADE_TICKS', () => {
    const p = tough(100, 100);
    p.brace = 5;
    expect(evadeBlow(p)).toBe(true);
    expect(p.brace).toBe(0);
    expect(p.evade).toBe(EVADE_TICKS);
    expect(canBeHit(p)).toBe(false);
    for (let i = 0; i < EVADE_TICKS; i++) {
      stepPlayer(p, BACK, open, MELEE);
      expect(p.x).toBe(100);
    }
    expect(p.evade).toBe(0);
    expect(canBeHit(p)).toBe(true);
    // Without a brace there is no evade.
    expect(evadeBlow(p)).toBe(false);
  });

  it('saves a player that strikes in a brute’s wind-up and steps back: the blow does not hit, and the brute does not run off', () => {
    const fight = bruteFight(BACK);
    expect(fight.evaded).toBe(true);
    // AVERAGE_DICE hits with every roll: the blow got no roll at all.
    expect(fight.hits).toBe(0);
    expect(fight.player.hp).toBe(1000);
    expect(fight.player.stun).toBe(0);
    // It stood where it was, through the brace and the evade (then it walks back: the step back is held).
    expect(fight.evadedAt).toEqual(fight.start);
    // As after a miss: it goes to the end of the line and chases, it does not run off.
    expect(fight.states.has('retreat')).toBe(false);
    expect(fight.states.has('chase')).toBe(true);
  });

  it('does not save a player that stands after the same attack: the blow rolls, and hits', () => {
    const fight = bruteFight(NO_INPUT);
    expect(fight.evaded).toBe(false);
    expect(fight.hits).toBe(1);
    expect(fight.player.hp).toBeLessThan(1000);
  });
});

/**
 * A brute next to a player winds up; 15 ticks into its wind-up the player attacks, and misses (the
 * test does not give the blow to the horde). The attack ends just before the blow of the brute (650
 * ms: 39 ticks). Then the player holds `after`. It runs until the first blow of the brute is over.
 */
function bruteFight(after: MoveInput) {
  const horde = new Horde(new World(textSource([])), everywhere, 2, AVERAGE_DICE);
  const p = tough(5 * TILE_SIZE, 5 * TILE_SIZE);
  const brute = horde.spawn('brute', p.x + 20, p.y);
  const player: HordePlayer = { id: 1, state: p, traits: MELEE };
  const start = { x: p.x, y: p.y };
  let windupAt = -1;
  let hits = 0;
  let evaded = false;
  let struck = false;
  let evadedAt: { x: number; y: number } | null = null;
  const states = new Set<string>();
  for (let tick = 0; tick < 600; tick++) {
    if (windupAt < 0 && brute.state === 'windup') windupAt = tick;
    const since = windupAt < 0 ? -1 : tick - windupAt;
    const input: MoveInput = since === 15 ? { x: 0, y: 0, attack: EAST } : since > 15 ? after : NO_INPUT;
    stepPlayer(p, input, horde.world, MELEE);
    hits += horde.step(TICK_MS, [player]).length;
    if (p.evade > 0) evaded = true;
    if (evaded && p.evade === 0 && !evadedAt) evadedAt = { x: p.x, y: p.y };
    if (brute.state === 'strike') struck = true;
    if (struck) states.add(brute.state);
    if (struck && brute.state !== 'strike') break;
  }
  return { player: p, start, hits, evaded, evadedAt, states };
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
    const inputs: MoveInput[] = [{ x: 0, y: 0, attack: EAST }, ...Array.from({ length: ATTACK_TICKS + 4 }, () => BACK)];
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
    expect(truth.brace).toBeGreaterThan(0);
    const before = { x: player.x, brace: player.brace, window: player.braceWindow };
    const { dx, dy } = prediction.reconcile(player, world, mine!, []);
    expect(Math.hypot(dx, dy)).toBeLessThan(1e-9);
    expect({ x: player.x, brace: player.brace, window: player.braceWindow }).toEqual(before);
    const seen = theirs!.p.find((w) => w[0] === joined.id)!;
    expect(seen[14]).toBe(truth.brace);
    expect(seen[15]).toBe(0);
  });
});
