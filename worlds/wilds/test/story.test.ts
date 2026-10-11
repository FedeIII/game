import { describe, expect, it } from 'vitest';
import {
  AVERAGE_DICE,
  EMPTY_BOOK,
  PLAIN_GEAR,
  PLAIN_SCORES,
  Room,
  TILE_SIZE,
  World,
  Decor,
  checkConditions,
  checkDialog,
  checkEffect,
  checkQuestDefs,
  checkScenes,
  fixtureTiles,
  startNode,
  traitsOf,
  type Conditions,
  type Dialog,
  type Pack,
  type QuestEffect,
  type Scores,
  type SnapshotMessage,
} from '@game/engine';
import { CART_REWARD, CART_SAFE, DEFAULT_SEED, NORTH_ROAD_START, RAID, REEVE, SILVERSPRING_SITE, SOLDIER, QUESTS, TOWN, TOWN_NPCS, WildsSource, inTown, wilds } from '../src/index.ts';

const source = new WildsSource(DEFAULT_SEED);
const npcIndex = (id: string) => source.npcs().findIndex((n) => n.id === id);
/** Where a player stands next to an NPC: the middle of its home tile. */
const besideNpc = (id: string) => {
  const [tx, ty] = source.npcs()[npcIndex(id)]!.home;
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
};
const withStr = (str: number) => traitsOf({ ...PLAIN_SCORES, str } as Scores, 'fighter', PLAIN_GEAR);
const join = (room: Room, at: { x: number; y: number }, str = 10, pack: Pack = { coins: 0, items: [] }) => room.join(0, 1, undefined, '', at, { traits: withStr(str), pack, hp: 1 })!;
/** Moves a player next to an NPC. */
const goTo = (player: { state: { x: number; y: number } }, id: string) => Object.assign(player.state, besideNpc(id));

/** Every effect and every condition of the Wilds: in the dialogs of the NPCs, on the things of the home, and in the variants of things. */
function contentOfTheWilds(): { effects: QuestEffect[]; conditions: Conditions[]; dialogs: Dialog[] } {
  const effects: QuestEffect[] = [];
  const conditions: Conditions[] = [];
  const dialogs: Dialog[] = [];
  const fixtures = [...new Set([...source.home().fixtures, ...source.fixturesIn(TOWN.x0 - 200, TOWN.y0 - 200, 200, 200)])];
  for (const content of [...source.npcs().map((n) => n.content), ...fixtures.map((f) => f.content)]) {
    if (content?.effect) effects.push(content.effect);
    if (!content?.dialog) continue;
    dialogs.push(content.dialog);
    for (const start of content.dialog.starts ?? []) conditions.push(start.when);
    for (const node of Object.values(content.dialog.nodes)) {
      for (const answer of node.answers) {
        if (answer.effect) effects.push(answer.effect);
        if (answer.when) conditions.push(answer.when);
      }
    }
  }
  for (const fixture of fixtures) if (fixture.variant) conditions.push(fixture.variant.when);
  return { effects, conditions, dialogs };
}

describe('the quests of the Wilds', () => {
  it('are good, and every effect and condition of the content names their quests and steps', () => {
    expect(wilds.quests).toBe(QUESTS);
    expect(checkQuestDefs(QUESTS)).toEqual([]);
    const { effects, conditions, dialogs } = contentOfTheWilds();
    expect(effects.map((e) => e.id).sort()).toEqual([
      'cart-help',
      'cart-help',
      'cart-lever',
      'cart-lift',
      'cart-lift',
      'cart-mend',
      'raid-asked',
      'raid-asked',
      'read-letter',
      'tell-reeve',
      'tell-reeve',
      'tell-reeve',
    ]);
    // The scenes: the argument in the house of the reeve.
    expect(checkScenes(source.scenes(), source.npcs().map((n) => n.id), QUESTS)).toEqual([]);
    expect(source.scenes().map((s) => s.id)).toEqual(['argument']);
    for (const effect of effects) expect(checkEffect(effect, QUESTS), effect.id).toEqual([]);
    for (const when of conditions) expect(checkConditions(when, QUESTS)).toEqual([]);
    for (const dialog of dialogs) expect(checkDialog(dialog), dialog.name).toEqual([]);
    // A step that marks an NPC on the map names an NPC of the world.
    for (const quest of QUESTS) for (const step of quest.steps) if (step.npc) expect(npcIndex(step.npc), `${quest.id}.${step.id}`).toBeGreaterThanOrEqual(0);
  });
});

describe('the cart on the road', () => {
  it('stands beside the road, between the home and the town, with the merchant on the road in front of it', () => {
    const world = new World(source);
    const cart = source.cart;
    const road = source.road;
    for (const [tx, ty, code] of fixtureTiles(cart)) {
      expect(world.structure(tx, ty)).toBe(code);
      expect(road.clear(tx, ty) && !road.on(tx, ty)).toBe(true);
      expect(road.on(tx, ty + 1)).toBe(true);
      expect(inTown(tx, ty)).toBe(false);
    }
    expect(world.fixtureAt(cart.tx + 1, cart.ty)).toBe(cart);
    const home = source.home();
    expect(cart.tx).toBeGreaterThan(TOWN.x1);
    expect(cart.tx).toBeLessThan(home.x0);
    // The merchant: the last NPC, on open road tiles in one row, outside the town.
    const merchant = source.npcs()[source.npcs().length - 1]!;
    expect(merchant.id).toBe('merchant');
    expect(source.npcs().length).toBe(TOWN_NPCS.length + 1);
    expect(merchant.area.length).toBeGreaterThanOrEqual(2);
    for (const [tx, ty] of merchant.area) {
      expect(world.solidBox(tx, ty), `${tx},${ty}`).toBeNull();
      expect(ty).toBe(cart.ty + 1);
      expect(inTown(tx, ty)).toBe(false);
    }
    const xs = merchant.area.map(([tx]) => tx).sort((a, b) => a - b);
    expect(xs[xs.length - 1]! - xs[0]!).toBe(xs.length - 1);
  });

  it('shows mended to a character who helped the merchant', () => {
    expect(source.cart.variant).toEqual({ when: { quest: 'cart', at: ['done'] }, frame: 'fixture/cart-mended' });
  });

  it('has a lantern that keeps the mobs away from the merchant, as the lamps of the town do', () => {
    const cart = source.cart;
    const rules = source.mobs();
    expect(cart.light).toBeTruthy();
    for (const [tx, ty] of [...source.npcs().at(-1)!.area, [cart.tx, cart.ty + 2], [cart.tx + 1, cart.ty - 2]] as const) {
      expect(rules.hunt(tx, ty), `${tx},${ty}`).toBe(false);
      expect(rules.roam(tx, ty), `${tx},${ty}`).toBe(false);
    }
    expect(rules.hunt(cart.tx + 1 + CART_SAFE + 1, cart.ty)).toBe(true);
  });
});

describe('the story through the server', () => {
  it('starts with the letter on the table of the home, and the reeve hears that Thrain sent the character', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const table = source.home().fixtures.find((f) => f.kind === 'table')!;
    const near = join(room, { x: table.tx * TILE_SIZE + 8, y: (table.ty + 1) * TILE_SIZE + 8 });
    const far = join(room, besideNpc('reeve'));
    expect(room.quest(far.id, { at: [table.tx, table.ty] }, 'read-letter', 0)).toBe(false);
    // The reeve does not hear of the letter from a character who did not read it.
    expect(room.quest(far.id, { npc: npcIndex('reeve') }, 'tell-reeve', 0)).toBe(false);
    expect(room.quest(near.id, { at: [table.tx, table.ty] }, 'read-letter', 0)).toBe(true);
    expect(near.quests.ashes?.step).toBe('letter');
    expect(far.quests).toEqual(EMPTY_BOOK);
    // A second reading changes nothing.
    expect(room.quest(near.id, { at: [table.tx, table.ty] }, 'read-letter', 0)).toBe(false);
    // An effect of another thing, or of nothing, does not apply.
    expect(room.quest(near.id, { at: [table.tx, table.ty] }, 'tell-reeve', 0)).toBe(false);
    goTo(near, 'reeve');
    expect(room.quest(near.id, { npc: npcIndex('reeve') }, 'tell-reeve', 0)).toBe(true);
    expect(near.quests.ashes?.step).toBe('reeve');
  });

  it('lets a strong character lift the cart, and the merchant pays', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const merchant = { npc: npcIndex('merchant') };
    const weak = join(room, besideNpc('merchant'), 12);
    const strong = join(room, besideNpc('merchant'), 13);
    // The cart cannot be lifted before the character offers help.
    expect(room.quest(strong.id, merchant, 'cart-lift', 0)).toBe(false);
    for (const p of [weak, strong]) expect(room.quest(p.id, merchant, 'cart-help', 0)).toBe(true);
    expect(room.quest(weak.id, merchant, 'cart-lift', 0)).toBe(false);
    expect(room.quest(strong.id, merchant, 'cart-lift', 0)).toBe(true);
    expect(strong.quests.cart).toMatchObject({ step: 'done', flags: ['lifted'] });
    expect(strong.pack.coins).toBe(CART_REWARD);
    expect(weak.quests.cart?.step).toBe('met');
    expect(weak.pack.coins).toBe(0);
    // Only once.
    expect(room.quest(strong.id, merchant, 'cart-lift', 0)).toBe(false);
    expect(strong.pack.coins).toBe(CART_REWARD);
  });

  it('lets any character bring a lever from the smith: the merchant keeps it, and pays', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const merchant = { npc: npcIndex('merchant') };
    const smith = { npc: npcIndex('smith') };
    const p = join(room, besideNpc('merchant'));
    expect(room.quest(p.id, merchant, 'cart-help', 0)).toBe(true);
    // The smith is far: no lever from here.
    expect(room.quest(p.id, smith, 'cart-lever', 0)).toBe(false);
    goTo(p, 'smith');
    expect(room.quest(p.id, smith, 'cart-lever', 0)).toBe(true);
    expect(p.quests.cart?.step).toBe('lever');
    expect(p.pack.items).toEqual([{ kind: 'crowbar', count: 1 }]);
    // One lever at a time.
    expect(room.quest(p.id, smith, 'cart-lever', 0)).toBe(false);
    goTo(p, 'merchant');
    expect(room.quest(p.id, merchant, 'cart-mend', 0)).toBe(true);
    expect(p.quests.cart).toMatchObject({ step: 'done', flags: ['lever'] });
    expect(p.pack).toEqual({ coins: CART_REWARD, items: [] });
  });

  it('plays the argument in the house of the reeve to a character with the letter; then the reeve asks it to warn Silverspring', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const scene = source.scenes().find((s) => s.id === 'argument')!;
    const house = { x: (scene.area.x0 + 3) * TILE_SIZE + 8, y: (scene.area.y1 - 1) * TILE_SIZE + 8 };
    const reader = join(room, house);
    const stranger = join(room, house);
    reader.quests = { ashes: { step: 'letter', flags: [], n: 1 } };
    // A character without the letter hears nothing of it.
    expect(room.quest(stranger.id, { scene: 'argument' }, 'raid-heard', 0)).toBe(false);
    // Another effect, or another scene, does not count.
    expect(room.quest(reader.id, { scene: 'argument' }, 'raid-asked', 0)).toBe(false);
    expect(room.quest(reader.id, { scene: 'nothing' }, 'raid-heard', 0)).toBe(false);
    // Far from the house, the end of the scene does not count either.
    const far = besideNpc('merchant');
    Object.assign(reader.state, far);
    expect(room.quest(reader.id, { scene: 'argument' }, 'raid-heard', 0)).toBe(false);
    Object.assign(reader.state, house);
    expect(room.quest(reader.id, { scene: 'argument' }, 'raid-heard', 0)).toBe(true);
    expect(reader.quests.raid?.step).toBe('heard');
    // Once.
    expect(room.quest(reader.id, { scene: 'argument' }, 'raid-heard', 0)).toBe(false);
    goTo(reader, 'reeve');
    expect(room.quest(reader.id, { npc: npcIndex('reeve') }, 'raid-asked', 0)).toBe(true);
    expect(reader.quests.raid?.step).toBe('asked');
    // The soldier tells it to stay out; the dialogs start by the step.
    expect(startNode(SOLDIER, reader.quests, reader.pack)).toBe('stay');
    expect(startNode(REEVE, reader.quests, reader.pack)).toBe('go');
    expect(startNode(REEVE, { ...reader.quests, raid: { step: 'heard', flags: [], n: 3 } }, reader.pack)).toBe('warn');
  });

  it('says the low line of the soldier only to a character with WIS 13', () => {
    const scene = source.scenes().find((s) => s.id === 'argument')!;
    const low = scene.lines.filter((l) => l.gate);
    expect(low).toHaveLength(1);
    expect(low[0]).toMatchObject({ npc: 'soldier', gate: { ability: 'wis', min: 13 } });
    expect(scene.when).toEqual([{ quest: 'ashes' }, { quest: 'raid', not: true }]);
  });

  it('sends the book to its player only: in the welcome, and in a snapshot after a change', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const merchant = { npc: npcIndex('merchant') };
    const a = join(room, besideNpc('merchant'));
    const b = join(room, besideNpc('merchant'));
    expect(room.welcome(a).qs).toEqual([]);
    room.welcome(b);
    room.quest(a.id, merchant, 'cart-help', 0);
    const sent = new Map<number, SnapshotMessage>();
    room.broadcast(0, (id, message) => sent.set(id, message as SnapshotMessage));
    expect(sent.get(a.id)?.qs).toEqual([['cart', 'met', 1, []]]);
    expect(sent.get(b.id)?.qs).toBeUndefined();
    // Nothing changed since: no book.
    room.broadcast(50, (id, message) => sent.set(id, message as SnapshotMessage));
    expect(sent.get(a.id)?.qs).toBeUndefined();
  });
});

describe('the north road and the grove', () => {
  it('lead from Ironhold to the site of Silverspring, which the raid marks on the map', () => {
    const north = source.north;
    const [sx, sy] = north.points[0]!;
    const [ex, ey] = north.points[north.points.length - 1]!;
    expect([Math.floor(sx), Math.floor(sy)]).toEqual([NORTH_ROAD_START.tx, NORTH_ROAD_START.ty]);
    expect([Math.floor(ex), Math.floor(ey)]).toEqual([SILVERSPRING_SITE.tx, SILVERSPRING_SITE.ty]);
    expect(Math.hypot(ex - sx, ey - sy)).toBeGreaterThan(240);
    expect(RAID.steps.find((s) => s.id === 'asked')!.at).toEqual([SILVERSPRING_SITE.tx, SILVERSPRING_SITE.ty]);
  });

  it('has a grove: trees close on both sides, the road open, no house in it', () => {
    const world = new World(source);
    const grove = source.grove;
    let trees = 0;
    let off = 0;
    for (let ty = grove.y0; ty <= grove.y1; ty++) {
      for (let tx = grove.x0; tx <= grove.x1; tx++) {
        if (!grove.has(tx, ty)) continue;
        if (source.north.on(tx, ty)) {
          expect(world.solidBox(tx, ty), `${tx},${ty}`).toBeNull();
          continue;
        }
        off++;
        if (world.decor(tx, ty) === Decor.Tree) trees++;
        expect(world.buildingAt(tx, ty)).toBeNull();
      }
    }
    // Denser than the woods along the same road, out of the grove.
    const along = (from: number, to: number): number => {
      const pts = source.north.points;
      let t = 0;
      let n = 0;
      for (let i = Math.floor(pts.length * from); i < pts.length * to; i += 4) {
        const [x, y] = pts[i]!;
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            const tx = Math.floor(x) + dx;
            const ty = Math.floor(y) + dy;
            if (source.north.clear(tx, ty) || grove.has(tx, ty) || world.buildingAt(tx, ty)) continue;
            n++;
            if (world.decor(tx, ty) === Decor.Tree) t++;
          }
        }
      }
      return t / n;
    };
    expect(trees / off).toBeGreaterThan(1.2 * along(0.5, 0.7));
  });
});

describe('the scouts in the grove', () => {
  it('ambush a character that goes to warn Silverspring; when they fall, the raid moves on, with their furs', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const [gx, gy] = source.grove.start;
    const p = join(room, { x: Math.floor(gx) * TILE_SIZE + 8, y: Math.floor(gy) * TILE_SIZE + 12 });
    p.quests = { raid: { step: 'asked', flags: [], n: 1 } };
    room.tick(0);
    room.tick(50);
    const horde = room.horde!;
    // Alone: a worg with its goblin on its back.
    expect(horde.mobs.map((m) => [m.kind, m.state])).toEqual([
      ['worg', 'idle'],
      ['goblin', 'ride'],
    ]);
    for (const mob of [...horde.mobs]) {
      mob.health = 1;
      horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, p.id);
    }
    for (let t = 100; t < 3000 && p.quests.raid?.step === 'asked'; t += 50) room.tick(t);
    expect(p.quests.raid?.step).toBe('scouts');
    expect(p.pack.items).toEqual([{ kind: 'badger-fur', count: 2 }]);
    expect(room.takeQuestSaves()).toEqual([p.id]);
    expect(room.takeQuestSaves()).toEqual([]);
  });

  it('wait only for a character at the step', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const [gx, gy] = source.grove.start;
    join(room, { x: Math.floor(gx) * TILE_SIZE + 8, y: Math.floor(gy) * TILE_SIZE + 12 });
    room.tick(0);
    room.tick(50);
    expect(room.horde!.mobs.filter((m) => m.kind === 'worg' || m.kind === 'goblin')).toEqual([]);
  });
});
