import { describe, expect, it } from 'vitest';
import {
  dice,
  AVERAGE_DICE,
  EMPTY_BOOK,
  PLAIN_GEAR,
  PLAIN_SCORES,
  Room,
  TILE_SIZE,
  World,
  Decor,
  Ground,
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
import {
  CARAVAN,
  CARAVAN_FINE,
  CARAVAN_FINE_COINS,
  CARAVAN_MEET,
  CARAVAN_REWARD,
  CARAVAN_ROB,
  PLOT,
  ASHES,
  ASHES_SYMBOL,
  HALE,
  MARROW,
  RUINS,
  RUIN_HALE,
  RUIN_MARROW,
  RUIN_TANNER,
  TANNER,
  brandTile,
  CAMP,
  CAMP_GATE,
  CAMP_STAKE,
  CART_REWARD,
  CART_SAFE,
  DEFAULT_SEED,
  HIMO_FREE,
  HIMO_REWARD,
  KASMUT,
  MITHRIL_COST,
  NORTH_ROAD_START,
  RAID,
  RAID_TITLE,
  RAID_TITLE_PERMIT,
  REEVE,
  SILVERSPRING,
  SILVERSPRING_SITE,
  SOLDIER,
  QUESTS,
  TOWN,
  TOWN_BUILDINGS,
  TOWN_GATE,
  TOWN_NPCS,
  WildsSource,
  inTown,
  wilds,
  MIRA,
  MIRA_STONE,
  MIRA_STONE_AFTER,
  ASHES_NEXT,
  SEEKER_CAMP_SITE,
  SEEKER_TRAIL,
  WREN,
  WREN_GATE,
  WREN_REWARD,
} from '../src/index.ts';

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
  for (const content of [...source.npcs().map((n) => n.content), ...fixtures.flatMap((f) => [f.content, f.variant?.content])]) {
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
      'ashes-next',
      'ashes-symbol',
      'ashes-symbol',
      'caravan-fine',
      'caravan-fine',
      'cart-help',
      'cart-help',
      'cart-lever',
      'cart-lift',
      'cart-lift',
      'cart-mend',
      'himo-free',
      'mira-stone',
      'mira-stone-after',
      'raid-asked',
      'raid-asked',
      'raid-title',
      'raid-title-permit',
      'read-letter',
      'ruin-hale',
      'ruin-marrow',
      'ruin-tanner',
      'tell-reeve',
      'tell-reeve',
      'tell-reeve',
    ]);
    // The effects of the story that the world applies by itself: the ends of the ambushes and of the escort of Himo.
    for (const ambush of source.ambushes()) {
      for (const effect of [ambush.effect, ...(ambush.march?.arrive ? [ambush.march.arrive] : [])]) expect(checkEffect(effect, QUESTS), effect.id).toEqual([]);
      expect(checkConditions(ambush.when, QUESTS)).toEqual([]);
    }
    for (const convoy of source.convoys()) {
      for (const effect of [convoy.saved, convoy.lost, convoy.robbed, ...convoy.waves.flatMap((w) => (w.effect ? [w.effect] : []))]) expect(checkEffect(effect, QUESTS), effect.id).toEqual([]);
      for (const when of [convoy.when, convoy.outlaw, ...convoy.waves.map((w) => w.when)]) expect(checkConditions(when, QUESTS)).toEqual([]);
      for (const member of convoy.members) if (member.content?.dialog) expect(checkDialog(member.content.dialog)).toEqual([]);
    }
    for (const escort of source.escorts()) {
      for (const effect of [escort.arrive, escort.fall]) expect(checkEffect(effect, QUESTS), effect.id).toEqual([]);
      expect(checkConditions(escort.when, QUESTS)).toEqual([]);
    }
    // The scenes: the argument in the house of the reeve, and the plot in the Crooked Lantern.
    expect(checkScenes(source.scenes(), source.npcs().map((n) => n.id), QUESTS)).toEqual([]);
    expect(source.scenes().map((s) => s.id)).toEqual(['argument', 'plot']);
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
    // The merchant: the NPC after the people of Ironhold, on open road tiles in one row, outside the town.
    const merchant = source.npcs()[TOWN_NPCS.length]!;
    expect(merchant.id).toBe('merchant');
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
    for (const [tx, ty] of [...source.npcs()[npcIndex('merchant')]!.area, [cart.tx, cart.ty + 2], [cart.tx + 1, cart.ty - 2]] as const) {
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

describe('the camp of the war band', () => {
  it('stands in the hills off the north road, between the grove and Silverspring, with a trail to it', () => {
    const world = new World(source);
    expect(CAMP.has(CAMP_STAKE[0], CAMP_STAKE[1])).toBe(true);
    // The map marks the post at the step `band` (quests.ts keeps the tile).
    expect(RAID.steps.find((s) => s.id === 'band')!.at).toEqual(CAMP_STAKE);
    expect(RAID.steps.find((s) => s.id === 'escort')!.at).toEqual([TOWN_GATE.tx, TOWN_GATE.ty]);
    // Off the road: no tile of the camp is on the north road or near it.
    for (let ty = CAMP.y0 - 2; ty <= CAMP.y1 + 2; ty++) for (let tx = CAMP.x0 - 2; tx <= CAMP.x1 + 2; tx++) expect(source.north.clear(tx, ty), `${tx},${ty}`).toBe(false);
    // North of the grove, and south-west of Silverspring.
    expect(CAMP.y1).toBeLessThan(source.grove.y0);
    expect(CAMP.x1).toBeLessThan(SILVERSPRING_SITE.tx);
    expect(CAMP.y0).toBeGreaterThan(SILVERSPRING_SITE.ty);
    // Two tents (shut), the fire with its light, and the post.
    expect(CAMP.buildings.map((b) => b.locked !== undefined)).toEqual([true, true]);
    const kinds = CAMP.streetFixtures.map((f) => f.kind);
    expect(kinds).toEqual(expect.arrayContaining(['campfire', 'stake']));
    const post = world.fixtureAt(CAMP_STAKE[0], CAMP_STAKE[1])!;
    expect(post.kind).toBe('stake');
    expect(post.variant?.when).toEqual({ quest: 'raid', at: ['band'] });
    expect(post.variant?.content?.effect).toBe(HIMO_FREE);
    // The trail: mud from the north road to the camp's way in.
    const trail = source.trail;
    const [x0, y0] = trail.points[0]!;
    expect(source.north.on(Math.floor(x0), Math.floor(y0))).toBe(true);
    expect(trail.on(CAMP_GATE.tx, CAMP_GATE.ty)).toBe(true);
    expect(world.ground(CAMP_GATE.tx, CAMP_GATE.ty)).toBe(Ground.Dirt);
    // From the trail, a player reaches the post.
    expect(world.solidBox(CAMP_GATE.tx, CAMP_GATE.ty)).toBeNull();
  });
});

/** A player of `room` on the north road at share `share` of its length (outside the towns). */
function onNorthRoad(room: Room, share: number) {
  const north = source.north;
  const [x, y] = north.points[Math.floor(north.points.length * share)]!;
  return join(room, { x: Math.floor(x) * TILE_SIZE + 8, y: Math.floor(y) * TILE_SIZE + 12 });
}

describe('the war band on the north road', () => {
  it('marches for a character at `scouts`: alone, the Devastator and a hobgoblin; when it falls on the road, the raid moves to `band`', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = onNorthRoad(room, 0.5);
    p.quests = { raid: { step: 'scouts', flags: [], n: 3 } };
    room.tick(0);
    room.tick(50);
    const horde = room.horde!;
    const band = horde.mobs.filter((m) => m.kind === 'devastator' || m.kind === 'hobgoblin');
    expect(band.map((m) => m.kind)).toEqual(['devastator', 'hobgoblin']);
    for (const mob of band) {
      mob.health = 1;
      horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, p.id);
    }
    for (let t = 100; t < 3000 && p.quests.raid?.step === 'scouts'; t += 50) room.tick(t);
    expect(p.quests.raid?.step).toBe('band');
    expect(room.takeQuestSaves()).toEqual([p.id]);
  });

  it('comes to Silverspring first if nobody stops it: the raid begins, its mobs come into the town, and its people take shelter', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = onNorthRoad(room, 0.95);
    p.quests = { raid: { step: 'scouts', flags: [], n: 3 } };
    p.state.hp = 10_000;
    room.tick(0);
    room.tick(50);
    const horde = room.horde!;
    expect(horde.mobs.some((m) => m.kind === 'devastator')).toBe(true);
    // The character waits in the town, where the band does not see it.
    Object.assign(p.state, { x: (SILVERSPRING.x0 + 12) * TILE_SIZE + 8, y: (SILVERSPRING.y0 + 11) * TILE_SIZE + 12 });
    let t = 100;
    for (; t < 120_000 && p.quests.raid?.step === 'scouts'; t += 50) room.tick(t);
    expect(p.quests.raid?.step).toBe('raid');
    room.tick((t += 50));
    // The raid: the band again, at the gate, free to come into the town.
    const raiders = horde.mobs.filter((m) => m.raider);
    expect(raiders.map((m) => m.kind)).toEqual(['devastator', 'hobgoblin']);
    for (let end = t + 8000; t < end; t += 50) room.tick(t);
    expect(raiders.some((m) => SILVERSPRING.has(Math.floor(m.x / TILE_SIZE), Math.floor(m.y / TILE_SIZE)))).toBe(true);
    // Kasmut has gone into the militia hall, and stays there.
    const kasmut = room.npcs!.poses[npcIndex('kasmut')]!;
    const [hx, hy] = source.npcs()[npcIndex('kasmut')]!.home;
    expect(Math.hypot(kasmut.x - (hx * TILE_SIZE + 8), kasmut.y - (hy * TILE_SIZE + 12))).toBeLessThan(TILE_SIZE);
    // The raid ends when the band falls in the town.
    for (const mob of raiders) {
      mob.health = 1;
      horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, p.id);
    }
    for (let end = t + 3000; t < end && p.quests.raid?.step === 'raid'; t += 50) room.tick(t);
    expect(p.quests.raid?.step).toBe('defended');
  }, 60_000);
});

describe('Himo', () => {
  it('is tied to the post for a character at `band`; cutting the ropes gives the escort, and Himo follows', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, { x: CAMP_STAKE[0] * TILE_SIZE + 8, y: (CAMP_STAKE[1] + 1) * TILE_SIZE + 8 });
    expect(room.quest(p.id, { at: CAMP_STAKE }, HIMO_FREE.id, 0)).toBe(false);
    p.quests = { raid: { step: 'band', flags: [], n: 4 } };
    expect(room.quest(p.id, { at: CAMP_STAKE }, HIMO_FREE.id, 0)).toBe(true);
    expect(p.quests.raid?.step).toBe('escort');
    room.tick(0);
    room.tick(50);
    expect(room.companions.list.map((c) => [c.def.id, c.def.name, c.leader])).toEqual([['himo', 'Himo', p.id]]);
  });

  it('comes home to Ironhold with the character: his family pays; or he falls on the way, and he is lost', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, { x: (TOWN_GATE.tx + 6) * TILE_SIZE + 8, y: TOWN_GATE.ty * TILE_SIZE + 12 });
    p.quests = { raid: { step: 'escort', flags: [], n: 5 } };
    room.tick(0);
    room.tick(50);
    const himo = room.companions.list[0]!;
    // Into the town, the two of them.
    Object.assign(p.state, { x: (TOWN_GATE.tx - 4) * TILE_SIZE + 8, y: TOWN_GATE.ty * TILE_SIZE + 12 });
    Object.assign(himo.state, { x: (TOWN_GATE.tx - 3) * TILE_SIZE + 8, y: TOWN_GATE.ty * TILE_SIZE + 12 });
    for (let t = 100; t < 2000 && p.quests.raid?.step === 'escort'; t += 50) room.tick(t);
    expect(p.quests.raid?.step).toBe('home');
    expect(p.pack.coins).toBe(HIMO_REWARD);
    expect(room.companions.list).toHaveLength(0);

    const other = new Room(new World(source), { dice: AVERAGE_DICE });
    const q = join(other, { x: (TOWN_GATE.tx + 30) * TILE_SIZE + 8, y: TOWN_GATE.ty * TILE_SIZE + 12 });
    q.quests = { raid: { step: 'escort', flags: [], n: 5 } };
    other.tick(0);
    other.tick(50);
    other.companions.list[0]!.state.hp = 0;
    other.companions.list[0]!.state.down = 1;
    for (let t = 100; t < 5000 && q.quests.raid?.step === 'escort'; t += 50) other.tick(t);
    expect(q.quests.raid?.step).toBe('lost');
    expect(other.companions.list).toHaveLength(0);
  });
});

describe('the end of the raid', () => {
  it('gives the title, the permit of Silverspring and a bed at the Silver Trout when the band fell on the road', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('kasmut'), 10, { coins: 50, items: [] });
    p.quests = { raid: { step: 'home', flags: [], n: 6 } };
    room.tick(0);
    goTo(p, 'kasmut');
    expect(startNode(KASMUT, p.quests, p.pack)).toBe('early');
    expect(room.quest(p.id, { npc: npcIndex('kasmut') }, RAID_TITLE_PERMIT.id, 0)).toBe(true);
    expect(p.quests.raid).toMatchObject({ step: 'title', flags: ['permit'] });
    expect(p.pack.items).toEqual([{ kind: 'mithril-permit', count: 1 }]);
    // The jeweller sells mithril at cost to the holder of the permit.
    goTo(p, 'jeweller');
    room.deal(p.id, { npc: npcIndex('jeweller') }, 'buy-mithril');
    expect(p.pack.coins).toBe(50 - MITHRIL_COST);
    expect(p.pack.items).toContainEqual({ kind: 'mithril', count: 1 });
    // Tova gives the bed of the guard.
    goTo(p, 'host');
    room.deal(p.id, { npc: npcIndex('host') }, 'room');
    expect(p.refuges).toContain('trout');
  });

  it('sells no mithril without the permit, and gives no bed before the title', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('jeweller'), 10, { coins: 50, items: [] });
    room.tick(0);
    goTo(p, 'jeweller');
    room.deal(p.id, { npc: npcIndex('jeweller') }, 'buy-mithril');
    expect(p.pack.coins).toBe(50);
    goTo(p, 'host');
    room.deal(p.id, { npc: npcIndex('host') }, 'room');
    expect(p.refuges).not.toContain('trout');
  });

  it('gives the title without the permit when the band fell in the town', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('kasmut'));
    p.quests = { raid: { step: 'defended', flags: [], n: 6 } };
    room.tick(0);
    goTo(p, 'kasmut');
    expect(startNode(KASMUT, p.quests, p.pack)).toBe('held');
    expect(room.quest(p.id, { npc: npcIndex('kasmut') }, RAID_TITLE_PERMIT.id, 0)).toBe(false);
    expect(room.quest(p.id, { npc: npcIndex('kasmut') }, RAID_TITLE.id, 0)).toBe(true);
    expect(p.quests.raid?.step).toBe('title');
    expect(p.pack.items).toEqual([]);
  });
});

describe('the burned homesteads', () => {
  it('stand on dry ground off the roads, each a shell with no roof and a phoenix that the map marks in order', () => {
    const world = new World(source);
    const steps = ASHES.steps;
    expect(RUINS.map((r) => brandTile(r))).toEqual([steps.find((s) => s.id === 'reeve')!.at, steps.find((s) => s.id === 'ruin1')!.at, steps.find((s) => s.id === 'ruin2')!.at]);
    for (const ruin of RUINS) {
      const [house] = ruin.buildings;
      expect(house!.style).toEqual({ walls: 'charred', roof: 'none' });
      expect(house!.locked).toBeUndefined();
      for (let ty = ruin.y0 - 2; ty <= ruin.y1 + 2; ty++) {
        for (let tx = ruin.x0 - 2; tx <= ruin.x1 + 2; tx++) {
          expect(source.road.clear(tx, ty) || source.north.clear(tx, ty) || source.trail.clear(tx, ty), `${ruin.name} ${tx},${ty}`).toBe(false);
          if (ruin.has(tx, ty)) expect(world.ground(tx, ty), `${ruin.name} ${tx},${ty}`).not.toBe(Ground.Water);
        }
      }
      const [bx, by] = brandTile(ruin);
      expect(world.fixtureAt(bx, by)?.kind).toBe('brand');
      // The mark reads more with INT 13.
      expect(world.fixtureAt(bx, by)?.content?.lore?.[0]?.gate).toEqual({ ability: 'int', min: 13 });
    }
  });

  it('move the story on in order: the Hale, the Marrow and the Tanner homestead, then the priest or the apothecary', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const [hx, hy] = brandTile(HALE);
    const p = join(room, { x: hx * TILE_SIZE + 8, y: (hy + 1) * TILE_SIZE + 8 });
    p.quests = { ashes: { step: 'reeve', flags: [], n: 2 } };
    const read = (ruin: typeof HALE, id: string) => {
      const [tx, ty] = brandTile(ruin);
      Object.assign(p.state, { x: tx * TILE_SIZE + 8, y: (ty + 1) * TILE_SIZE + 8 });
      return room.quest(p.id, { at: [tx, ty] }, id, 0);
    };
    // Out of order, nothing happens.
    expect(read(MARROW, RUIN_MARROW.id)).toBe(false);
    expect(read(HALE, RUIN_HALE.id)).toBe(true);
    expect(read(MARROW, RUIN_MARROW.id)).toBe(true);
    expect(read(TANNER, RUIN_TANNER.id)).toBe(true);
    expect(p.quests.ashes?.step).toBe('ruins');
    room.tick(0);
    goTo(p, 'priest');
    const priest = source.npcs()[npcIndex('priest')]!.content.dialog!;
    expect(startNode(priest, p.quests, p.pack)).toBe('troubled');
    expect(room.quest(p.id, { npc: npcIndex('priest') }, ASHES_SYMBOL.id, 0)).toBe(true);
    expect(p.quests.ashes?.step).toBe('symbol');
  });

  it('have survivors who saw only shadows; Wisdom 13 calms them, and they tell more', () => {
    for (const id of ['hale-survivor', 'tanner-survivor']) {
      const npc = source.npcs()[npcIndex(id)]!;
      const dialog = npc.content.dialog!;
      expect(checkDialog(dialog)).toEqual([]);
      const calm = Object.values(dialog.nodes).flatMap((n) => n.answers).filter((a) => a.next === 'calm');
      expect(calm.length, id).toBeGreaterThan(0);
      for (const a of calm) expect(a.gate).toEqual({ ability: 'wis', min: 13 });
      expect(RUINS.some((r) => r.has(npc.home[0], npc.home[1]))).toBe(true);
    }
  });
});

describe('the caravan of Silverspring', () => {
  /** A player of `room` on the north road at share `share`, with `quests`. */
  const onRoad = (room: Room, share: number, quests: Record<string, { step: string; flags: string[]; n: number }>) => {
    const p = onNorthRoad(room, share);
    p.quests = quests;
    p.state.hp = 10_000;
    return p;
  };

  it('is plotted in the Crooked Lantern: a character who knows of the hobgoblins overhears where it is attacked', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const inn = TOWN_BUILDINGS.find((b) => b.id === 'inn')!;
    const p = join(room, { x: inn.doorX * TILE_SIZE + 8, y: (inn.y1 - 1) * TILE_SIZE + 12 });
    expect(room.quest(p.id, { scene: 'plot' }, PLOT.effect.id, 0)).toBe(false);
    p.quests = { raid: { step: 'asked', flags: [], n: 1 } };
    expect(room.quest(p.id, { scene: 'plot' }, PLOT.effect.id, 0)).toBe(true);
    expect(p.quests.caravan?.step).toBe('heard');
    // The first lines need a keen ear (WIS 15, then 13); the last ones are for everybody.
    expect(PLOT.lines.map((l) => l.gate?.min ?? 0)).toEqual([15, 15, 13, 13, 0, 0, 0]);
    // The map marks the meeting point.
    const [mx, my] = source.north.points[Math.floor(source.north.points.length * CARAVAN_MEET)]!;
    expect(CARAVAN.steps[0]!.at).toEqual([Math.floor(mx), Math.floor(my)]);
  });

  it('leaves Silverspring for a character at `heard` near the meeting point, and the scouts wait for it instead of the grove', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = onRoad(room, 0.9, { raid: { step: 'asked', flags: [], n: 1 }, caravan: { step: 'heard', flags: [], n: 2 } });
    room.tick(0);
    room.tick(50);
    expect(room.guards.list.map((g) => g.def.id)).toEqual(['wagon', 'militia', 'militia']);
    const wagon = room.guards.list[0]!;
    expect(Math.hypot(wagon.state.x - SILVERSPRING_SITE.tx * TILE_SIZE, wagon.state.y - SILVERSPRING_SITE.ty * TILE_SIZE)).toBeLessThan(4 * TILE_SIZE);
    // In the grove, no scouts for this character: they wait at the caravan.
    const q = join(room, { x: Math.floor(source.grove.start[0]) * TILE_SIZE + 8, y: Math.floor(source.grove.start[1]) * TILE_SIZE + 12 });
    q.quests = p.quests;
    room.tick(100);
    expect(room.horde!.mobs.filter((m) => m.kind === 'worg')).toEqual([]);
  });

  it('meets the scouts and the war band if they live, and other hobgoblins of the clan if not; saved, it pays', () => {
    for (const [raid, first] of [
      ['asked', 'worg'],
      ['title', 'hobgoblin'],
    ] as const) {
      const room = new Room(new World(source), { dice: AVERAGE_DICE });
      const p = onRoad(room, 0.82, { raid: { step: raid, flags: [], n: 1 }, caravan: { step: 'heard', flags: [], n: 2 } });
      // At the roadside: the wagon stops for a character who stands in its way.
      p.state.y += 3 * TILE_SIZE;
      let t = 0;
      room.tick(t);
      // The caravan walks to the meeting point; the character waits there.
      let attackers: string[] = [];
      for (; t < 120_000 && attackers.length === 0; t += 50) {
        room.tick(t);
        attackers = room.horde!.mobs.filter((m) => room.convoys.mobs.includes(m.id)).map((m) => m.kind);
      }
      expect(attackers[0], raid).toBe(first);
      // The waves fall, one after the other.
      for (let wave = 0; wave < 4 && p.quests.caravan?.step === 'heard'; wave++) {
        for (const mob of room.horde!.mobs.filter((m) => room.convoys.mobs.includes(m.id))) {
          mob.health = 1;
          room.horde!.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, p.id);
        }
        for (let end = t + 3000; t < end && p.quests.caravan?.step === 'heard'; t += 50) room.tick(t);
      }
      expect(p.quests.caravan?.step, raid).toBe('saved');
      expect(p.pack.coins, raid).toBe(CARAVAN_REWARD);
      expect(p.pack.items, raid).toContainEqual({ kind: 'draught', count: 1 });
      if (raid === 'asked') expect(p.quests.raid?.step).toBe('band');
    }
  }, 120_000);

  it('can be robbed: the driver refuses, the militia fight; when they fall, the cargo is the robber\'s, and it is wanted until it pays its fine', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = onRoad(room, 0.95, { raid: { step: 'title', flags: [], n: 1 }, caravan: { step: 'heard', flags: [], n: 2 } });
    room.tick(0);
    room.tick(50);
    const wagon = room.guards.list[0]!;
    Object.assign(p.state, { x: wagon.state.x + 12, y: wagon.state.y });
    expect(room.quest(p.id, { guard: wagon.id }, CARAVAN_ROB.id, 100)).toBe(true);
    expect(p.quests.caravan?.step).toBe('robbing');
    const kill = { toHit: 99, damage: dice(0, 0, 99), push: 1, stagger: 1, opening: 0 };
    for (const militia of room.guards.list.filter((g) => g.def.blow)) room.guards.strike({ x: militia.state.x - 12, y: militia.state.y }, 0, p.id, kill, ['caravan'], AVERAGE_DICE);
    for (let t = 150; t < 5000 && p.quests.caravan?.step === 'robbing'; t += 50) room.tick(t);
    expect(p.quests.caravan?.step).toBe('robbed');
    expect(p.pack.items).toEqual(expect.arrayContaining([{ kind: 'mithril', count: 5 }, { kind: 'badger-fur', count: 3 }]));
    expect(room.guards.list).toHaveLength(0);
    // Wanted: Marta does not sell an ale; the reeve takes the fine, and then she does.
    goTo(p, 'innkeeper');
    const coins = p.pack.coins;
    room.deal(p.id, { npc: npcIndex('innkeeper') }, 'ale');
    expect(p.pack.coins).toBe(coins);
    const innkeeper = source.npcs()[npcIndex('innkeeper')]!.content.dialog!;
    expect(startNode(innkeeper, p.quests, p.pack)).toBe('wanted');
    p.pack = { ...p.pack, coins: 100 };
    goTo(p, 'reeve');
    expect(room.quest(p.id, { npc: npcIndex('reeve') }, CARAVAN_FINE.id, 200)).toBe(true);
    expect(p.pack.coins).toBe(100 - CARAVAN_FINE_COINS);
    expect(p.quests.caravan?.step).toBe('pardoned');
    goTo(p, 'innkeeper');
    room.deal(p.id, { npc: npcIndex('innkeeper') }, 'ale');
    expect(p.pack.coins).toBeLessThan(100 - CARAVAN_FINE_COINS);
  });
});

describe('the Wren homestead', () => {
  const middle = [(WREN.x0 + WREN.x1 + 1) / 2, (WREN.y0 + WREN.y1 + 1) / 2] as const;
  const at = (id: string) => ASHES.steps.find((s) => s.id === id)!.at;

  it('stands whole by the pool of the Silvervein, with Mira Wren, and a burned trail leads east to the camp of the Seekers', () => {
    const world = new World(source);
    // The map marks the homestead for `next` and `stone`, and the camp of the Seekers for `held` and `late`.
    expect(at('next')).toEqual([Math.floor(middle[0]), Math.floor(middle[1])]);
    expect(at('stone')).toEqual(at('next'));
    expect(at('held')).toEqual([SEEKER_CAMP_SITE.tx, SEEKER_CAMP_SITE.ty]);
    expect(at('late')).toEqual(at('held'));
    const [house] = WREN.buildings;
    expect(house!.locked).toBeUndefined();
    expect(house!.style?.roof).not.toBe('none');
    for (let ty = WREN.y0; ty <= WREN.y1; ty++) for (let tx = WREN.x0; tx <= WREN.x1; tx++) expect(world.ground(tx, ty), `${tx},${ty}`).not.toBe(Ground.Water);
    const mira = source.npcs()[npcIndex('mira')]!;
    expect(WREN.has(mira.home[0], mira.home[1])).toBe(true);
    expect(mira.content.dialog).toBe(MIRA);
    // The trail: from the yard to the west edge of the camp, open all the way.
    expect(SEEKER_TRAIL.on(WREN_GATE[0] + 1, WREN_GATE[1])).toBe(true);
    expect(SEEKER_TRAIL.on(SEEKER_CAMP_SITE.tx - 8, SEEKER_CAMP_SITE.ty)).toBe(true);
    for (const [x, y] of SEEKER_TRAIL.points) expect(world.solidBox(Math.floor(x), Math.floor(y)), `${x},${y}`).toBeNull();
  });

  it('is next after the priest connects the clues', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('priest'));
    p.quests = { ashes: { step: 'symbol', flags: [], n: 6 } };
    const priest = source.npcs()[npcIndex('priest')]!.content.dialog!;
    expect(startNode(priest, p.quests, p.pack)).toBe('pattern');
    room.tick(0);
    goTo(p, 'priest');
    expect(room.quest(p.id, { npc: npcIndex('priest') }, ASHES_NEXT.id, 0)).toBe(true);
    expect(p.quests.ashes?.step).toBe('next');
  });

  it('races a character at `next`: Mira gives the stone, the hounds come, and when they fall the watcher goes in ash and Mira pays', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('mira'));
    p.quests = { ashes: { step: 'next', flags: [], n: 7 } };
    p.state.hp = 10_000;
    room.tick(0);
    room.tick(50);
    const horde = room.horde!;
    // Alone: two hounds and the watcher, at the camp end of the trail, far from the house.
    const band = horde.mobs.filter((m) => m.story);
    expect(band.map((m) => m.kind).sort()).toEqual(['hound', 'hound', 'watcher']);
    for (const mob of band) expect(Math.hypot(mob.x / TILE_SIZE - middle[0], mob.y / TILE_SIZE - middle[1])).toBeGreaterThan(30);
    goTo(p, 'mira');
    expect(startNode(MIRA, p.quests, p.pack)).toBe('warn');
    expect(room.quest(p.id, { npc: npcIndex('mira') }, MIRA_STONE.id, 0)).toBe(true);
    expect(p.quests.ashes?.step).toBe('stone');
    expect(p.pack.items).toEqual([{ kind: 'wave-stone', count: 1 }]);
    // The hounds come on; the watcher stops short of the house.
    let t = 100;
    for (; t < 40_000; t += 50) room.tick(t);
    const watcher = horde.mobs.find((m) => m.kind === 'watcher')!;
    expect(Math.hypot(watcher.x / TILE_SIZE - middle[0], watcher.y / TILE_SIZE - middle[1])).toBeGreaterThan(8);
    expect(p.quests.ashes?.step).toBe('stone');
    for (const mob of horde.mobs.filter((m) => m.kind === 'hound')) {
      mob.health = 1;
      horde.strike({ x: mob.x - 18, y: mob.y }, 0, undefined, p.id);
    }
    for (let end = t + 4000; t < end && p.quests.ashes?.step === 'stone'; t += 50) room.tick(t);
    expect(p.quests.ashes?.step).toBe('held');
    expect(horde.mobs.some((m) => m.story)).toBe(false);
    expect(p.pack.coins).toBe(WREN_REWARD);
    expect(startNode(MIRA, p.quests, p.pack)).toBe('thanks');
  }, 60_000);

  it('comes too late for a character that does not hurry: the hounds reach the door, the Seekers take the stone, and they go', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, { x: (WREN.x0 - 20) * TILE_SIZE, y: middle[1] * TILE_SIZE });
    p.quests = { ashes: { step: 'next', flags: [], n: 7 } };
    room.tick(0);
    room.tick(50);
    const horde = room.horde!;
    expect(horde.mobs.filter((m) => m.story).length).toBe(3);
    // The character goes far to the west, out of the race.
    Object.assign(p.state, { x: (WREN.x0 - 60) * TILE_SIZE, y: middle[1] * TILE_SIZE });
    let t = 100;
    for (; t < 60_000 && p.quests.ashes?.step === 'next'; t += 50) room.tick(t);
    expect(p.quests.ashes?.step).toBe('late');
    room.tick(t + 50);
    expect(horde.mobs.some((m) => m.story)).toBe(false);
    expect(startNode(MIRA, p.quests, p.pack)).toBe('taken');
  }, 60_000);

  it('gives the stone after the fight to a character who fought the hounds before it warned Mira', () => {
    const room = new Room(new World(source), { dice: AVERAGE_DICE });
    const p = join(room, besideNpc('mira'));
    p.quests = { ashes: { step: 'held', flags: [], n: 9 } };
    room.tick(0);
    goTo(p, 'mira');
    const thanks = MIRA.nodes.thanks!.answers.find((a) => a.next === 'after')!;
    expect(thanks.when).toEqual({ has: 'wave-stone', not: true });
    expect(room.quest(p.id, { npc: npcIndex('mira') }, MIRA_STONE_AFTER.id, 0)).toBe(true);
    expect(p.pack.items).toEqual([{ kind: 'wave-stone', count: 1 }]);
    expect(p.quests.ashes?.step).toBe('held');
  });
});
