import { describe, expect, it } from 'vitest';
import { NPC_HOLD_RADIUS, NpcCrowd, Room, World, findInteraction, createPlayer, npcActors, npcFixture, standPoint, type NpcDef, type SnapshotMessage } from '../src/index.ts';
import { houseSource } from './helpers.ts';

/** The interior of the test house (walls x 2..8, y 2..6): x 3..7, y 3..5. */
const INSIDE: [number, number][] = [];
for (let ty = 3; ty <= 5; ty++) for (let tx = 3; tx <= 7; tx++) INSIDE.push([tx, ty]);
const keeper: NpcDef = { id: 'keeper', look: 'healer', home: [5, 4], area: INSIDE, content: { pages: ['Hello.'], speaker: 'fixture' } };

const tileOf = (p: { x: number; y: number }) => `${Math.floor(p.x / 16)},${Math.floor(p.y / 16)}`;

describe('walking NPCs', () => {
  it('wander their own area only, and stop for times of every length', () => {
    const crowd = new NpcCrowd(new World(houseSource()), [keeper], 7);
    const area = new Set(INSIDE.map(([x, y]) => `${x},${y}`));
    const visited = new Set<string>();
    const stops: number[] = [];
    let still = 0;
    for (let t = 0; t < 30 * 60_000; t += 50) {
      crowd.step(50, []);
      const pose = crowd.poses[0]!;
      expect(area.has(tileOf(pose)), `at ${tileOf(pose)}`).toBe(true);
      visited.add(tileOf(pose));
      if (pose.vx === 0 && pose.vy === 0) still += 50;
      else if (still > 0) {
        stops.push(still);
        still = 0;
      }
    }
    expect(visited.size).toBe(INSIDE.length);
    expect(Math.min(...stops)).toBeLessThan(2500);
    expect(Math.max(...stops)).toBeGreaterThan(12_000);
    expect(new Set(stops.map((s) => Math.round(s / 1000))).size).toBeGreaterThan(8);
  });

  it('walk at a calm pace, from tile to tile', () => {
    const crowd = new NpcCrowd(new World(houseSource()), [keeper], 3);
    let fastest = 0;
    for (let t = 0; t < 120_000; t += 50) {
      crowd.step(50, []);
      const p = crowd.poses[0]!;
      fastest = Math.max(fastest, Math.hypot(p.vx, p.vy));
    }
    expect(fastest).toBeGreaterThan(20);
    expect(fastest).toBeLessThan(40);
  });

  it('stop and turn to a player who comes close, and walk on when the player goes', () => {
    const crowd = new NpcCrowd(new World(houseSource()), [keeper], 11);
    // Wait until it walks.
    let t = 0;
    while (crowd.poses[0]!.vx === 0 && crowd.poses[0]!.vy === 0 && t < 120_000) {
      crowd.step(50, []);
      t += 50;
    }
    const pose = crowd.poses[0]!;
    const player = { x: pose.x + NPC_HOLD_RADIUS - 6, y: pose.y };
    const before = { x: pose.x, y: pose.y };
    for (let i = 0; i < 100; i++) crowd.step(50, [player]);
    expect([pose.x, pose.y]).toEqual([before.x, before.y]);
    expect(pose.facing).toBe('right');
    for (let i = 0; i < 2000 && pose.x === before.x && pose.y === before.y; i++) crowd.step(50, [{ x: 0, y: 0 }]);
    expect(pose.x !== before.x || pose.y !== before.y).toBe(true);
  });

  it('can be talked to where it is, as the same fixture while it moves', () => {
    const crowd = new NpcCrowd(new World(houseSource()), [keeper], 5);
    for (let i = 0; i < 400; i++) crowd.step(50, []);
    const pose = crowd.poses[0]!;
    const player = createPlayer(pose.x, pose.y + 9);
    player.facing = 'up';
    const target = findInteraction(new World(houseSource()), player, () => true, npcActors([keeper], crowd.poses));
    expect(target?.kind).toBe('npc');
    expect(target?.fixture).toBe(npcFixture(keeper));
    expect(npcFixture(keeper).content?.pages).toEqual(['Hello.']);
  });

  it('start on their home tile', () => {
    const crowd = new NpcCrowd(new World(houseSource()), [keeper], 1);
    expect({ x: crowd.poses[0]!.x, y: crowd.poses[0]!.y }).toEqual(standPoint(5, 4));
  });

  it('walk on the server, and every snapshot carries them', () => {
    const world = new World({ ...houseSource(), npcs: () => [keeper] });
    const room = new Room(world, { random: () => 0.25 });
    const p = room.join(0, 1)!;
    const seen: SnapshotMessage[] = [];
    for (let ms = 0; ms <= 60_000; ms += 50) {
      room.tick(ms);
      room.broadcast(ms, (_, m) => seen.push(m));
    }
    expect(seen.every((m) => m.n?.length === 1)).toBe(true);
    const tiles = new Set(seen.map((m) => `${Math.floor(m.n![0]![0] / 16)},${Math.floor(m.n![0]![1] / 16)}`));
    expect(tiles.size).toBeGreaterThan(2);
    void p;
  });
});

describe('NPCs and doors', () => {
  // The test house: walls x 2..8, y 2..6, door at (5, 6). Outside: x 3..7, y 7..8.
  const OUTSIDE: [number, number][] = [];
  for (let ty = 7; ty <= 8; ty++) for (let tx = 3; tx <= 7; tx++) OUTSIDE.push([tx, ty]);
  const walker: NpcDef = { ...keeper, id: 'walker', area: [...INSIDE, [5, 6], ...OUTSIDE] };
  const inHouse = (p: { y: number }) => p.y < 6 * 16;

  it('go out and in through the door: open it, pass, and close it behind them', () => {
    const world = new World(houseSource());
    const crowd = new NpcCrowd(world, [walker], 21);
    let trips = 0;
    let wasInside = true;
    let openSteps = 0;
    for (let t = 0; t < 20 * 60_000; t += 50) {
      crowd.step(50, []);
      const pose = crowd.poses[0]!;
      const inside = inHouse(pose);
      if (inside !== wasInside) {
        trips++;
        wasInside = inside;
      }
      const onDoor = Math.floor(pose.x / 16) === 5 && Math.floor(pose.y / 16) === 6;
      if (onDoor) expect(world.isDoorOpen(5, 6), 'the door is open while it passes').toBe(true);
      if (world.isDoorOpen(5, 6)) openSteps++;
    }
    expect(trips).toBeGreaterThan(6);
    // The door is open only for the moments of passing, not for the whole walk.
    expect(openSteps * 50).toBeLessThan(trips * 4000);
    expect(world.isDoorOpen(5, 6) && !(Math.floor(crowd.poses[0]!.y / 16) === 6)).toBe(false);
  });

  it('do not close a door on a player in the doorway, and leave a door open that they did not open', () => {
    const world = new World(houseSource());
    const crowd = new NpcCrowd(world, [walker], 21);
    const pose = crowd.poses[0]!;
    // Run until the NPC has passed the door that it opened: it stands on the tile outside.
    let t = 0;
    while (!(world.isDoorOpen(5, 6) && Math.floor(pose.y / 16) === 7) && t < 20 * 60_000) {
      crowd.step(50, []);
      t += 50;
    }
    expect(world.isDoorOpen(5, 6)).toBe(true);
    // A player steps into the doorway at that moment: the door stays open.
    const inDoorway = { x: 5 * 16 + 8, y: 6 * 16 + 8 };
    for (let i = 0; i < 60; i++) crowd.step(50, [inDoorway]);
    expect(world.isDoorOpen(5, 6), 'open while the player stands in it').toBe(true);
    // The player goes: the NPC closes it.
    for (let i = 0; i < 20; i++) crowd.step(50, [{ x: 0, y: 0 }]);
    expect(world.isDoorOpen(5, 6), 'closed when the doorway is clear').toBe(false);

    const other = new World(houseSource());
    other.setDoorOpen(5, 6, true);
    const crowd2 = new NpcCrowd(other, [walker], 21);
    for (let i = 0; i < 20 * 60 * 20; i++) crowd2.step(50, []);
    expect(other.isDoorOpen(5, 6), 'a door that a player opened stays open').toBe(true);
  });
});
