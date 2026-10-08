import { describe, expect, it } from 'vitest';
import {
  Decor,
  Ground,
  PLAYER_HALF_HEIGHT,
  PLAYER_HALF_WIDTH,
  Structure,
  TILE_SIZE,
  World,
  createPlayer,
  decodeFixture,
  findInteraction,
  fixtureTiles,
  isInside,
  type Facing,
  type Fixture,
} from '@game/engine';
import { ROOF_PROPS, ROOF_STYLES, WALL_STYLES } from '../../../packages/engine-client/art/buildings.ts';
import { GLYPHS } from '../../../packages/engine-client/art/font.ts';
import { Camera } from '../../../packages/engine-client/src/render/camera.ts';
import { BOUNDS, HOUSES, OUTDOOR, PROJECTS, SPAWN, TownSource, floorOf, town } from '../src/index.ts';

const world = new World(new TownSource());

/** Whether the player's feet hitbox at (x, y) is clear of every solid box, on allowed tiles only. */
function standsAt(x: number, y: number, allowed: (tx: number, ty: number) => boolean): boolean {
  const [x0, x1, y0, y1] = [x - PLAYER_HALF_WIDTH, x + PLAYER_HALF_WIDTH, y - PLAYER_HALF_HEIGHT, y + PLAYER_HALF_HEIGHT];
  for (let ty = Math.floor(y0 / TILE_SIZE); ty <= Math.floor((y1 - 1) / TILE_SIZE); ty++) {
    for (let tx = Math.floor(x0 / TILE_SIZE); tx <= Math.floor((x1 - 1) / TILE_SIZE); tx++) {
      if (!allowed(tx, ty)) return false;
      const box = world.solidBox(tx, ty);
      if (!box) continue;
      const [bx0, by0, bx1, by1] = [tx * TILE_SIZE + box[0], ty * TILE_SIZE + box[1], tx * TILE_SIZE + box[2], ty * TILE_SIZE + box[3]];
      if (x0 < bx1 && x1 > bx0 && y0 < by1 && y1 > by0) return false;
    }
  }
  return true;
}

/**
 * Walks the player from (x, y) in steps of `step` pixels over the allowed tiles, and acts in
 * every direction at every place. Returns the fixtures it can act on, and 'door x,y' for doors.
 */
function reachableTargets(x: number, y: number, allowed: (tx: number, ty: number) => boolean, step: number): Set<Fixture | string> {
  const accept = (kind: string, fixture: Fixture | null) => Boolean(fixture?.content ?? town.examine[kind]);
  const found = new Set<Fixture | string>();
  const seen = new Set<string>();
  const queue: [number, number][] = [[x, y]];
  expect(standsAt(x, y, allowed), `start ${x},${y}`).toBe(true);
  while (queue.length) {
    const [px, py] = queue.pop()!;
    const key = `${px},${py}`;
    if (seen.has(key) || !standsAt(px, py, allowed)) continue;
    seen.add(key);
    for (const facing of ['up', 'down', 'left', 'right'] as Facing[]) {
      const player = createPlayer(px, py);
      player.facing = facing;
      const target = findInteraction(world, player, accept);
      if (target?.fixture) found.add(target.fixture);
      else if (target?.kind === 'door') found.add(`door ${target.tx},${target.ty}`);
    }
    queue.push([px + step, py], [px - step, py], [px, py + step], [px, py - step]);
  }
  return found;
}

/** The characters the font draws, and those it maps to one it draws (as the client does). */
function drawable(ch: string): boolean {
  const plain: Record<string, string> = { '‘': "'", '’': "'", '“': '"', '”': '"', '…': '.' };
  return ch in GLYPHS || (plain[ch] ?? ch.normalize('NFD')[0]!) in GLYPHS;
}

describe('the town of Azyr', () => {
  it('has a house for every project of the landing page, with its name on the sign', () => {
    expect(HOUSES.map((h) => h.sign)).toEqual(['vest101', 'Osler·MD', 'Kandrax Rol', 'Kandrax App', 'Hidden Agenda', 'Azyrio', 'GitHub', 'Journal']);
  });

  it('gives every house one portal with an https link, a keeper, and at least three exhibits', () => {
    for (const house of HOUSES) {
      const portals = house.fixtures.filter((f) => f.kind === 'portal');
      expect(portals, house.id).toHaveLength(1);
      const link = portals[0]!.content?.link;
      expect(link?.url, house.id).toMatch(/^https:\/\//);
      expect(link?.title).toBe(house.sign);
      expect(house.fixtures.filter((f) => f.kind === 'npc' && f.content?.speaker === 'fixture'), house.id).toHaveLength(1);
      expect(house.fixtures.filter((f) => f.kind !== 'npc' && f.kind !== 'portal' && f.content).length, house.id).toBeGreaterThanOrEqual(3);
      // Everything that collides has something to say; a rug only lies on the floor.
      for (const f of house.fixtures) if (f.kind !== 'rug') expect(f.content?.pages?.length, `${house.id} ${f.kind}`).toBeGreaterThan(0);
    }
  });

  it('links each portal to the link of its project page', () => {
    const urls = Object.fromEntries(PROJECTS.map((p) => [p.id, p.portal.url]));
    expect(urls).toEqual({
      vest101: 'https://vest101.com',
      osler: 'https://osler.azyr.io',
      'kandrax-rol': 'https://www.youtube.com/@KandraxRol',
      'kandrax-app': 'https://www.kandrax.app/',
      'hidden-agenda': 'https://hidden-agenda.azyr.io/',
      azyrio: 'https://www.youtube.com/@Azyrio',
      github: 'https://github.com/FedeIII',
      journal: 'https://journal.azyr.io',
    });
  });

  it('gives every house its own walls and roof, and a plan that fits in its walls', () => {
    expect(new Set(HOUSES.map((h) => h.style?.walls)).size).toBe(HOUSES.length);
    expect(new Set(HOUSES.map((h) => h.style?.roof)).size).toBe(HOUSES.length);
    for (const house of HOUSES) {
      const width = house.x1 - house.x0 + 1;
      const height = house.y1 - house.y0 + 1;
      expect(width, house.id).toBeLessThanOrEqual(8);
      expect(height, house.id).toBeLessThanOrEqual(7);
      for (const f of house.fixtures) {
        for (const [tx, ty] of fixtureTiles(f)) {
          expect(isInside(house, tx, ty) && !(tx === house.doorX && ty === house.y1), `${house.id} ${f.kind} at ${tx},${ty}`).toBe(true);
        }
      }
      expect(world.structure(house.doorX, house.y1 - 1), `${house.id}: the tile inside the door`).toBe(Structure.Floor);
      for (const tx of house.windows ?? []) expect(world.structure(tx, house.y1)).toBe(Structure.Window);
      expect(world.ground(house.doorX, house.y1 - 1)).toBe(floorOf(house));
    }
  });

  it('names only wall styles, roof styles and roof props that the art has', () => {
    for (const house of HOUSES) {
      expect(Object.keys(WALL_STYLES), house.id).toContain(house.style?.walls);
      expect(Object.keys(ROOF_STYLES), house.id).toContain(house.style?.roof);
      for (const prop of house.roofProps ?? []) {
        expect(ROOF_PROPS, house.id).toContain(prop.name);
        expect(prop.tx > house.x0 && prop.tx < house.x1, `${house.id} ${prop.name} in a corner column`).toBe(true);
      }
    }
  });

  it('keeps the ground in front of every door clear: no lamp, prop, tree or wall', () => {
    for (const house of HOUSES) {
      for (let ty = house.y1 + 1; ty <= house.y1 + 3; ty++) {
        for (let tx = house.doorX - 2; tx <= house.doorX + 2; tx++) {
          const where = `${house.id}: ${tx},${ty}`;
          expect(world.solidBox(tx, ty), where).toBeNull();
          expect(world.fixtureAt(tx, ty), where).toBeNull();
          expect(world.decor(tx, ty), where).not.toBe(Decor.Tree);
          expect(world.buildingAt(tx, ty), where).toBeNull();
        }
      }
      // The two tiles straight in front of the door are paved.
      expect(world.ground(house.doorX, house.y1 + 1), house.id).toBe(Ground.Cobble);
      expect(world.ground(house.doorX, house.y1 + 2), house.id).toBe(Ground.Cobble);
    }
  });

  it('shows all eight doors at once from the spawn on a desktop, and the middle ones on a phone', () => {
    const spawn = world.spawn();
    /** The doors whose front face (the door tile and the row of wall above it) is on the screen. */
    const doorsSeen = (width: number, height: number, dpr: number) => {
      const camera = new Camera();
      camera.resize(width, height, dpr);
      const stage = { scale: { set() {} }, position: { set() {} } };
      camera.follow(stage as unknown as Parameters<Camera['follow']>[0], spawn.x, spawn.y);
      const view = camera.view();
      return HOUSES.filter((h) => {
        const [x0, y0, x1, y1] = [h.doorX * TILE_SIZE, (h.y1 - 1) * TILE_SIZE, (h.doorX + 1) * TILE_SIZE, (h.y1 + 1) * TILE_SIZE];
        return x0 >= view.x && x1 <= view.x + view.width && y0 >= view.y && y1 <= view.y + view.height;
      }).map((h) => h.id);
    };
    // 1280 x 720 is the smallest common desktop view: 15 rows of tiles.
    expect(doorsSeen(1280, 720, 1)).toHaveLength(8);
    expect(doorsSeen(1920, 1080, 1)).toHaveLength(8);
    expect(doorsSeen(1366, 768, 1)).toHaveLength(8);
    // A phone held upright: a narrow view, the four doors in the middle.
    expect(doorsSeen(390, 844, 2).length).toBeGreaterThanOrEqual(4);
    expect(doorsSeen(360, 780, 3).length).toBeGreaterThanOrEqual(4);
  });

  it('lets the player walk to every thing of a house and act on it', () => {
    for (const house of HOUSES) {
      const found = reachableTargets(house.doorX * TILE_SIZE + 8, (house.y1 - 1) * TILE_SIZE + 8, (tx, ty) => isInside(house, tx, ty), 2);
      for (const f of house.fixtures) {
        if (!f.content) continue;
        expect(found.has(f), `${house.id} ${f.kind} at ${f.tx},${f.ty}`).toBe(true);
      }
    }
  });

  it('lets the player walk from the plaza to every door and every thing outside', () => {
    const spawn = world.spawn();
    const inTown = (tx: number, ty: number) => tx >= BOUNDS.x0 && tx <= BOUNDS.x1 && ty >= BOUNDS.y0 && ty <= BOUNDS.y1 && !world.buildingAt(tx, ty);
    const found = reachableTargets(spawn.x, spawn.y, inTown, 4);
    for (const f of OUTDOOR) expect(found.has(f), `${f.kind} at ${f.tx},${f.ty}`).toBe(true);
    for (const house of HOUSES) expect(found.has(`door ${house.doorX},${house.y1}`), house.id).toBe(true);
  });

  it('puts the structure of every fixture in the world, so they collide and can be found', () => {
    for (const f of [...HOUSES.flatMap((h) => h.fixtures), ...OUTDOOR]) {
      for (const [tx, ty, code] of fixtureTiles(f)) {
        expect(world.structure(tx, ty)).toBe(code);
        expect(decodeFixture(code)?.type.kind).toBe(f.kind);
        expect(world.fixtureAt(tx, ty)).toBe(f);
      }
    }
  });

  it('starts the player in the plaza, on cobblestones, outside every house', () => {
    const spawn = world.spawn();
    const [tx, ty] = [Math.floor(spawn.x / TILE_SIZE), Math.floor(spawn.y / TILE_SIZE)];
    expect(Math.abs(tx - SPAWN.tx) + Math.abs(ty - SPAWN.ty)).toBeLessThanOrEqual(2);
    expect(world.ground(tx, ty)).toBe(Ground.Cobble);
    expect(world.buildingAt(tx, ty)).toBeNull();
  });

  it('lets the player in front of a keeper talk to them', () => {
    const house = HOUSES[0]!;
    const keeper = house.fixtures.find((f) => f.kind === 'npc')!;
    const player = createPlayer(keeper.tx * TILE_SIZE + 8, (keeper.ty + 1) * TILE_SIZE + 6);
    player.facing = 'up';
    const target = findInteraction(world, player);
    expect(target?.kind).toBe('npc');
    expect(target?.fixture).toBe(keeper);
  });

  it('has a glyph in the pixel font for every character of every text', () => {
    const texts = [
      ...HOUSES.flatMap((h) => [h.sign ?? '', ...h.fixtures.flatMap((f) => [...(f.content?.pages ?? []), f.content?.link?.title ?? ''])]),
      ...OUTDOOR.flatMap((f) => f.content?.pages ?? []),
    ];
    const missing = new Set([...texts.join('')].filter((ch) => !drawable(ch)));
    expect([...missing]).toEqual([]);
  });
});
