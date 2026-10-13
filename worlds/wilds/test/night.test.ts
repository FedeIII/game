import { describe, expect, it } from 'vitest';
import { Room, Structure, TILE_SIZE, World, clockAtHour, type NpcDef } from '@game/engine';
import { DEFAULT_SEED, IRONHOLD, SILVERSPRING, WHITEGROVE, WildsSource, wilds } from '../src/index.ts';

const key = (tx: number, ty: number) => `${tx},${ty}`;
const tileOf = (p: { x: number; y: number }) => key(Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE));

describe('the people of the Wilds at night (Fede, 2026-10-13: the people without a post go home)', () => {
  const source = new WildsSource(DEFAULT_SEED);
  const world = new World(source);
  const npcs = source.npcs();
  const homeward = npcs.filter((n) => n.night);

  it('sends home the widow, the villager of Whitegrove and the panner of Silverspring, and nobody else', () => {
    expect(homeward.map((n) => n.id).sort()).toEqual(['prospector', 'whitegrove-villager', 'widow']);
  });

  it('never sends home a person with a role: a conversation, a scene or a step of a quest', () => {
    const inScenes = new Set(source.scenes().flatMap((s) => s.lines.map((l) => l.npc)));
    const inQuests = new Set((wilds.quests ?? []).flatMap((q) => q.steps.flatMap((s) => (s.npc ? [s.npc] : []))));
    for (const npc of homeward) {
      expect(npc.content.dialog, npc.id).toBeUndefined();
      expect(inScenes.has(npc.id), npc.id).toBe(false);
      expect(inQuests.has(npc.id), npc.id).toBe(false);
    }
    // The child of Ironhold has no post, but it sees a character arrive (the scene of the arrival): it stays.
    expect(inScenes.has('child')).toBe(true);
    expect(npcs.find((n) => n.id === 'child')!.night).toBeUndefined();
  });

  it('gives each one an open way home, in one piece with its area, to its door or into an open building', () => {
    for (const npc of homeward) {
      const night = npc.night!;
      const way = night.way ?? [];
      for (const [x, y] of way) if (world.structure(x, y) !== Structure.Door) expect(world.solidBox(x, y), `${npc.id}: ${x},${y}`).toBeNull();
      const tiles = new Set([...npc.area, ...way].map(([x, y]) => key(x, y)));
      const seen = new Set<string>();
      const queue: [number, number][] = [[npc.home[0], npc.home[1]]];
      while (queue.length) {
        const [x, y] = queue.pop()!;
        if (seen.has(key(x, y)) || !tiles.has(key(x, y))) continue;
        seen.add(key(x, y));
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      expect(seen.size, npc.id).toBe(tiles.size);
      const [tx, ty] = night.tile;
      const inside = world.buildingAt(tx, ty);
      // Inside an open building, or just south of the door of a shut house.
      if (inside) expect(inside.locked, npc.id).toBeUndefined();
      else expect(world.buildingAt(tx, ty - 1)?.locked, npc.id).toBeDefined();
    }
  });

  it('takes them home on the server at night, silent, and out again by day', () => {
    const at = (hour: number) => new Room(new World(new WildsSource(DEFAULT_SEED)), { random: () => 0.4, day: wilds.day, clock: () => clockAtHour(hour, wilds.day!) });
    const night = at(23);
    const index = (id: string) => npcs.findIndex((n) => n.id === id);
    const quiet = new Set(homeward.map((n) => index(n.id)));
    let lines = 0;
    let theirs = 0;
    night.join(0, 1);
    for (let ms = 0; ms <= 3 * 60_000; ms += 50) {
      night.tick(ms);
      night.broadcast(ms, (_, m) => {
        lines += m.b?.length ?? 0;
        theirs += (m.b ?? []).filter(([i]) => quiet.has(i)).length;
      });
    }
    // A crowd that starts at night has them at home at once; the room says no lines of theirs.
    const poses = night.npcs!.poses;
    const def = (id: string): NpcDef => npcs[index(id)]!;
    expect(tileOf(poses[index('widow')]!)).toBe(key(...def('widow').night!.tile));
    expect(poses[index('widow')]!.away).toBeFalsy();
    expect(IRONHOLD.buildings.find((b) => b.id === 'chapel')).toBeDefined();
    expect(world.buildingAt(...def('widow').night!.tile)?.id).toBe('chapel');
    expect(poses[index('whitegrove-villager')]!.away).toBe(true);
    expect(tileOf(poses[index('whitegrove-villager')]!)).toBe(key(...WHITEGROVE.at(14, 19)));
    expect(world.buildingAt(...WHITEGROVE.at(14, 18))?.id).toBe('whitegrove-cottage');
    expect(world.buildingAt(...SILVERSPRING.at(5, 18))?.id).toBe('panner-house');
    expect(poses[index('prospector')]!.away).toBe(true);
    expect(tileOf(poses[index('prospector')]!)).toBe(key(...SILVERSPRING.at(5, 19)));
    // The others speak on; those three say nothing.
    expect(lines).toBeGreaterThan(0);
    expect(theirs).toBe(0);
    // The others are out as by day: the watchman of Ironhold, the child, the peddler.
    for (const id of ['watchman', 'child', 'peddler']) expect(poses[index(id)]!.away, id).toBeFalsy();

    // At dusk they walk home from where they are: the widow along the square and the street into the chapel.
    let hour = 19;
    const dusk = new Room(new World(new WildsSource(DEFAULT_SEED)), { random: () => 0.4, day: wilds.day, clock: () => clockAtHour(hour, wilds.day!) });
    for (let ms = 0; ms <= 60_000; ms += 50) dusk.tick(ms);
    hour = 21;
    let throughDoor = false;
    const chapel = IRONHOLD.buildings.find((b) => b.id === 'chapel')!;
    for (let ms = 60_050; ms <= 3 * 60_000; ms += 50) {
      dusk.tick(ms);
      if (tileOf(dusk.npcs!.poses[index('widow')]!) === key(chapel.doorX, chapel.y1)) throughDoor = true;
    }
    expect(throughDoor).toBe(true);
    for (const npc of homeward) expect(tileOf(dusk.npcs!.poses[index(npc.id)]!), npc.id).toBe(key(...npc.night!.tile));
    expect(dusk.world.isDoorOpen(chapel.doorX, chapel.y1)).toBe(false);

    const day = at(12);
    for (let ms = 0; ms <= 60_000; ms += 50) day.tick(ms);
    for (const npc of homeward) {
      const pose = day.npcs!.poses[index(npc.id)]!;
      expect(pose.away, npc.id).toBeFalsy();
      expect(new Set(npc.area.map(([x, y]) => key(x, y))).has(tileOf(pose)), npc.id).toBe(true);
    }
  });
});
