import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  NpcCrowd,
  Piles,
  Prediction,
  Room,
  Structure,
  TILE_SIZE,
  World,
  checkPlace,
  createPlayer,
  findInteraction,
  fixtureCode,
  fixtureType,
  npcActors,
  parseClientMessage,
  resumePlace,
  stairsLanding,
  stepPlayer,
  storeyCount,
  useStairs,
  type Fixture,
  type NpcDef,
  type SnapshotMessage,
} from '../src/index.ts';
import { houseSource } from './helpers.ts';

/**
 * The house of houseSource() (walls x 2..8, y 2..6, the door at 5, 6) with a storey above it: stairs
 * against the east wall (tiles 6..7, 3..4), the stairwell on the same tiles upstairs, a lectern and a
 * window upstairs.
 */
const STAIRS: Fixture = { kind: 'stairs', tx: 6, ty: 4 };
const WELL: Fixture = { kind: 'stairwell', tx: 6, ty: 4 };
const LECTERN: Fixture = { kind: 'lectern', tx: 4, ty: 3, content: { pages: ['A book upstairs.'] } };
const towerSource = () => houseSource({ fixtures: [STAIRS], storeys: [{ fixtures: [WELL, LECTERN], windows: [4] }] });

/** A player on a storey, at the centre of a tile. */
function playerOn(tx: number, ty: number, storey = 0) {
  const player = createPlayer(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
  player.storey = storey;
  return player;
}

describe('the storeys of a building', () => {
  it('give each storey a map of its own: the walls all round, its windows and things, and solid outside', () => {
    const world = new World(towerSource());
    const up = world.level(1);
    expect(world.level(0)).toBe(world);
    expect(storeyCount(world.buildingAt(5, 4)!)).toBe(2);
    // The door below is a wall above; the window of the storey is a window.
    expect(world.structure(5, 6)).toBe(Structure.Door);
    expect(up.structure(5, 6)).toBe(Structure.Wall);
    expect(up.structure(4, 6)).toBe(Structure.Window);
    expect(up.structure(5, 4)).toBe(Structure.Floor);
    expect(up.structure(6, 4)).toBe(fixtureCode(fixtureType('stairwell'), 0));
    expect(up.fixtureAt(7, 3)).toBe(WELL);
    expect(up.fixtureAt(4, 3)).toBe(LECTERN);
    // No storey outside the building, and none above it.
    expect(up.solidBox(0, 0)).not.toBeNull();
    expect(world.level(2).solidBox(5, 4)).not.toBeNull();
  });

  it('take a player up the stairs and down the stairwell, to the tile south of them', () => {
    const world = new World(towerSource());
    const landing = stairsLanding(STAIRS);
    // South of the middle of the two columns of the stairs.
    expect(landing).toEqual({ x: 7 * TILE_SIZE, y: 5 * TILE_SIZE + 8 });
    const player = playerOn(7, 5);
    player.x -= 3;
    expect(useStairs(world, player, 7, 4)).toBe('up');
    expect(player).toMatchObject({ storey: 1, ...landing, facing: 'down' });
    expect(useStairs(world, player, 7, 4)).toBe('down');
    expect(player.storey).toBe(0);
    // Out of reach, or busy: nothing.
    const far = playerOn(3, 5);
    expect(useStairs(world, far, 7, 4)).toBeNull();
    player.attack = 5;
    expect(useStairs(world, player, 7, 4)).toBeNull();
    expect(player.storey).toBe(0);
  });

  it('keep a player on its storey: the door below is a wall above, and its things collide', () => {
    const world = new World(towerSource());
    world.setDoorOpen(5, 6, true);
    const below = playerOn(5, 5);
    const above = playerOn(5, 5, 1);
    for (let i = 0; i < 40; i++) {
      stepPlayer(below, { x: 0, y: 1 }, world.level(below.storey));
      stepPlayer(above, { x: 0, y: 1 }, world.level(above.storey));
    }
    expect(below.y).toBeGreaterThan(7 * TILE_SIZE);
    expect(above.y).toBeLessThan(6 * TILE_SIZE);
    // West, to the lectern: it stops the player above; below, the floor is open.
    const west = playerOn(5, 3, 1);
    for (let i = 0; i < 40; i++) stepPlayer(west, { x: -1, y: 0 }, world.level(1));
    expect(west.x).toBeGreaterThan(5 * TILE_SIZE - 6);
  });

  it('show the action button only the things of the storey', () => {
    const world = new World(towerSource());
    const above = playerOn(5, 3, 1);
    above.facing = 'left';
    above.x -= 6;
    expect(findInteraction(world.level(1), above)?.fixture).toBe(LECTERN);
    const below = { ...above, storey: 0 };
    expect(findInteraction(world.level(0), below)?.fixture).toBeUndefined();
    // The stairs and the stairwell are targets on their storeys.
    const foot = playerOn(7, 5);
    foot.facing = 'up';
    expect(findInteraction(world.level(0), foot)?.kind).toBe('stairs');
    expect(findInteraction(world.level(1), { ...foot, storey: 1 })?.kind).toBe('stairwell');
  });

  it('give a place on a storey back on that storey, else on the ground', () => {
    const world = new World(towerSource());
    expect(resumePlace(world, 5 * TILE_SIZE + 8, 4 * TILE_SIZE + 8, 1)).toEqual({ x: 5 * TILE_SIZE + 8, y: 4 * TILE_SIZE + 8, storey: 1 });
    // On the lectern upstairs: the nearest open tile of the storey.
    const moved = resumePlace(world, 4 * TILE_SIZE + 8, 3 * TILE_SIZE + 8, 1);
    expect(moved.storey).toBe(1);
    expect(world.level(1).solidBox(Math.floor(moved.x / TILE_SIZE), Math.floor(moved.y / TILE_SIZE))).toBeNull();
    // A storey that the building does not have: the ground.
    expect(resumePlace(world, 5 * TILE_SIZE + 8, 4 * TILE_SIZE + 8, 3).storey).toBe(0);
    expect(checkPlace({ world: 'wilds', x: 1, y: 2, storey: 1 })).toEqual({ world: 'wilds', x: 1, y: 2, storey: 1 });
    expect(checkPlace({ world: 'wilds', x: 1, y: 2, storey: -1 })).toEqual({ world: 'wilds', x: 1, y: 2 });
  });

  it('let items lie on a storey, apart from the items on the ground below', () => {
    const world = new World(towerSource());
    const piles = new Piles(world);
    const [below] = piles.put(5 * TILE_SIZE + 8, 4 * TILE_SIZE + 8, [{ kind: 'ring', count: 1 }], 0);
    const [above] = piles.put(5 * TILE_SIZE + 8, 4 * TILE_SIZE + 8, [{ kind: 'ring', count: 1 }], 0, undefined, 1);
    expect(below!.storey).toBeUndefined();
    expect(above).toMatchObject({ storey: 1, count: 1 });
    expect(above!.id).not.toBe(below!.id);
  });

  it('give NPCs a storey: only the players on it see them and stop them', () => {
    const world = new World(towerSource());
    const clerk: NpcDef = { id: 'clerk', look: 'priest', home: [5, 4], area: [[5, 4], [6, 4], [5, 5]], content: { pages: ['Upstairs.'] }, storey: 1 };
    const crowd = new NpcCrowd(world, [clerk], 7);
    expect(npcActors([clerk], crowd.poses, 1)).toHaveLength(1);
    expect(npcActors([clerk], crowd.poses, 0)).toHaveLength(0);
    // A player on the ground under it does not hold it; one on its storey does.
    const pose = crowd.poses[0]!;
    const walked = () => {
      const before = { ...pose };
      for (let i = 0; i < 200; i++) crowd.step(100, [{ x: before.x, y: before.y, storey: 0 }]);
      return pose.x !== before.x || pose.y !== before.y;
    };
    expect(walked()).toBe(true);
    for (let i = 0; i < 50; i++) crowd.step(100, [{ x: pose.x, y: pose.y, storey: 1 }]);
    const held = { x: pose.x, y: pose.y };
    for (let i = 0; i < 50; i++) crowd.step(100, [{ x: held.x, y: held.y, storey: 1 }]);
    expect(pose).toMatchObject(held);
  });
});

describe('storeys in a shared world', () => {
  const at = (tx: number, ty: number, storey = 0) => ({ x: tx * TILE_SIZE + 8, y: ty * TILE_SIZE + 8, storey });

  it('start a character on the storey of its place, and say it in the welcome and the snapshot', () => {
    const room = new Room(new World(towerSource()), { dice: AVERAGE_DICE });
    const player = room.join(0, 1, undefined, '', at(5, 4, 1))!;
    expect(player.state).toMatchObject(at(5, 4, 1));
    expect(room.welcome(player).st).toBe(1);
    let snap: SnapshotMessage | undefined;
    room.broadcast(0, (_id, message) => (snap = message));
    expect(snap!.you[24]).toBe(1);
  });

  it('take a player up the stairs with the input that carries them, and keep it there', () => {
    const room = new Room(new World(towerSource()), { dice: AVERAGE_DICE });
    const player = room.join(0, 1, undefined, '', at(7, 5))!;
    room.input(player.id, { t: 'in', s: 1, i: [[0, 0], [0, 0]], c: [[2, 7, 4]] }, 0);
    expect(player.state.storey).toBe(1);
    // A door below is out of reach from above.
    const before = room.welcome(player).doors.length;
    room.input(player.id, { t: 'in', s: 3, i: [[0, 0]], d: [[3, 5, 6, 1]] }, 50);
    expect(room.welcome(player).doors).toHaveLength(before);
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0]], c: [[1, 7, 4]] }))).toMatchObject({ c: [[1, 7, 4]] });
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0]], c: [[1, 7]] }))).toBeNull();
  });

  it('predict the stairs on the page, and keep them through a snapshot from before them', () => {
    const world = new World(towerSource());
    const room = new Room(new World(towerSource()), { dice: AVERAGE_DICE });
    const joined = room.join(0, 1, undefined, '', at(7, 5))!;
    const prediction = new Prediction();
    const player = createPlayer(0, 0);
    prediction.reset(player, world, room.welcome(joined));
    prediction.step(player, world, { x: 0, y: 0 });
    expect(prediction.stairs(player, world, 7, 4)).toBe('up');
    prediction.step(player, world, { x: 0, y: 0 });
    prediction.step(player, world, { x: 0, y: 0 });
    // The server has the first input only: the page keeps the player upstairs.
    let snap: SnapshotMessage | undefined;
    room.input(joined.id, { t: 'in', s: 1, i: [[0, 0]] }, 0);
    room.broadcast(0, (_id, message) => (snap = message));
    prediction.reconcile(player, world, snap!, []);
    expect(player.storey).toBe(1);
    // And the batch carries the stairs to the server, which agrees.
    const batch = prediction.takeBatch()!;
    expect(batch.c).toEqual([[2, 7, 4]]);
    room.input(joined.id, batch, 50);
    expect(joined.state.storey).toBe(1);
  });
});
