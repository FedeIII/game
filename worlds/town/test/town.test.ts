import { describe, expect, it } from 'vitest';
import { Ground, Structure, TILE_SIZE, World, createPlayer, decodeFixture, findInteraction, fixtureTiles, isInside } from '@game/engine';
import { GLYPHS } from '../../../packages/engine-client/art/font.ts';
import { HOUSES, OUTDOOR, PROJECTS, SPAWN, TownSource } from '../src/index.ts';

const world = new World(new TownSource());

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
      expect(house.fixtures.filter((f) => f.kind !== 'npc' && f.kind !== 'portal').length, house.id).toBeGreaterThanOrEqual(3);
      for (const f of house.fixtures) expect(f.content?.pages?.length, `${house.id} ${f.kind}`).toBeGreaterThan(0);
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

  it('keeps every fixture inside its house, off the walls and off the corridor', () => {
    for (const house of HOUSES) {
      for (const f of house.fixtures) {
        for (const [tx, ty] of fixtureTiles(f)) {
          expect(isInside(house, tx, ty) && !(tx === house.doorX && ty === house.y1), `${house.id} ${f.kind} at ${tx},${ty}`).toBe(true);
          if (f.kind !== 'portal') expect(tx === house.doorX && ty > house.y0 + 1, `${house.id} ${f.kind} on the corridor`).toBe(false);
        }
      }
    }
  });

  it('can reach every fixture of a house from its door', () => {
    for (const house of HOUSES) {
      const seen = new Set<string>();
      const queue: [number, number][] = [[house.doorX, house.y1 - 1]];
      while (queue.length) {
        const [x, y] = queue.pop()!;
        const key = `${x},${y}`;
        if (seen.has(key) || world.structure(x, y) !== Structure.Floor) continue;
        seen.add(key);
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      for (const f of house.fixtures) {
        const reachable = fixtureTiles(f).some(([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => seen.has(`${nx},${ny}`)));
        expect(reachable, `${house.id} ${f.kind}`).toBe(true);
      }
    }
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
