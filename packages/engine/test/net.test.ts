import { describe, expect, it } from 'vitest';
import {
  INPUT_BATCH_TICKS,
  MAX_INPUTS_PER_MESSAGE,
  NO_INPUT,
  MOB_SEND_RADIUS,
  PROTOCOL_VERSION,
  Prediction,
  Remotes,
  Room,
  SNAPSHOT_RATE,
  TICK_RATE,
  TILE_SIZE,
  World,
  createPlayer,
  fromWireInput,
  cleanName,
  parseClientMessage,
  random,
  toWireInput,
  type InputMessage,
  type MoveInput,
  type PlayerState,
  type ServerMessage,
  type SnapshotMessage,
  type WorldSource,
} from '../src/index.ts';
import { houseSource, mobHouseSource } from './helpers.ts';

const TICK_MS = 1000 / TICK_RATE;
const SNAPSHOT_MS = 1000 / SNAPSHOT_RATE;

/** A client of the simulated network: its own world, a predicted player and the others. */
class SimClient {
  readonly world: World;
  readonly player: PlayerState = createPlayer(0, 0);
  readonly prediction = new Prediction();
  readonly remotes = new Remotes();
  id = 0;
  welcomed = false;
  /** The largest jump that a reconciliation made, in pixels. */
  worstCorrection = 0;
  nextTickMs = 0;
  ticks = 0;
  readonly input: (tick: number) => MoveInput;
  /** Ticks per real tick: 2 is a client with a clock twice too fast. */
  readonly speed: number;
  readonly skin = Math.floor(Math.random() * 0xffffffff);

  constructor(input: (tick: number) => MoveInput, speed = 1, source: () => WorldSource = houseSource) {
    this.input = input;
    this.speed = speed;
    this.world = new World(source());
  }

  receive(message: ServerMessage, nowMs: number): void {
    if (message.t === 'welcome') {
      this.id = message.id;
      this.prediction.reset(this.player, this.world, message);
      this.welcomed = true;
    } else if (message.t === 'snap') {
      const others = this.remotes.at(nowMs).map((r) => ({ ...r }));
      const { dx, dy } = this.prediction.reconcile(this.player, this.world, message, others);
      this.worstCorrection = Math.max(this.worstCorrection, Math.hypot(dx, dy));
      this.remotes.apply(message, nowMs);
    }
  }
}

/** A server room and clients, with a one-way latency, in simulated milliseconds. */
class SimNetwork {
  readonly room: Room;
  readonly clients: SimClient[] = [];
  private readonly queue: { at: number; order: number; run: () => void }[] = [];
  private order = 0;
  nowMs = 0;
  private nextSnapshotMs = 0;

  readonly latencyMs: number;

  constructor(latencyMs: number, source: () => WorldSource = houseSource) {
    this.latencyMs = latencyMs;
    this.room = new Room(new World(source()));
  }

  private later(at: number, run: () => void): void {
    this.queue.push({ at, order: this.order++, run });
  }

  connect(client: SimClient, at?: [number, number]): void {
    this.clients.push(client);
    client.nextTickMs = this.nowMs;
    this.later(this.nowMs + this.latencyMs, () => {
      const player = this.room.join(this.nowMs, client.skin, at);
      if (!player) throw new Error('room full');
      const welcome = this.room.welcome(player);
      this.later(this.nowMs + this.latencyMs, () => client.receive(welcome, this.nowMs));
    });
  }

  /** Sends a message from a client; the room gets it after the latency. */
  send(client: SimClient, message: InputMessage): void {
    const id = client.id;
    this.later(this.nowMs + this.latencyMs, () => this.room.input(id, message, this.nowMs));
  }

  run(ms: number): void {
    const end = this.nowMs + ms;
    for (; this.nowMs <= end; this.nowMs++) {
      this.queue.sort((a, b) => a.at - b.at || a.order - b.order);
      while (this.queue.length && this.queue[0]!.at <= this.nowMs) this.queue.shift()!.run();
      for (const client of this.clients) {
        while (client.welcomed && client.nextTickMs <= this.nowMs) {
          client.nextTickMs += TICK_MS / client.speed;
          client.prediction.step(client.player, client.world, client.input(client.ticks++), client.remotes.viewTime(this.nowMs));
          const batch = client.prediction.takeBatch();
          if (batch) this.send(client, batch);
        }
        if (!client.welcomed) client.nextTickMs = this.nowMs;
      }
      if (this.nowMs >= this.nextSnapshotMs) {
        this.nextSnapshotMs += SNAPSHOT_MS;
        this.room.tick(this.nowMs);
        this.room.broadcast(this.nowMs, (id, message) => {
          const client = this.clients.find((c) => c.id === id);
          if (client) this.later(this.nowMs + this.latencyMs, () => client.receive(message, this.nowMs));
        });
      }
    }
  }
}

/** A walk that changes direction every half second, into walls and the house too. */
function wander(seed: number): (tick: number) => MoveInput {
  const rng = random(seed);
  const moves: MoveInput[] = [];
  return (tick) => {
    const k = Math.floor(tick / 30);
    while (moves.length <= k) {
      const angle = rng() * Math.PI * 2;
      const length = rng() < 0.2 ? 0 : rng() < 0.5 ? 1 : 0.4 + rng() * 0.6;
      moves.push({ x: Math.cos(angle) * length, y: Math.sin(angle) * length });
    }
    return moves[k]!;
  };
}

/** Walks straight up from the spawn (south of the door) towards the door. */
const north: (tick: number) => MoveInput = () => ({ x: 0, y: -1 });

describe('the multiplayer protocol', () => {
  it('reads valid client messages and refuses everything else', () => {
    const v = PROTOCOL_VERSION;
    expect(parseClientMessage(`{"t":"hello","v":${v},"world":"town","skin":4294967295}`)).toEqual({ t: 'hello', v, world: 'town', skin: 4294967295, name: '' });
    expect(parseClientMessage(`{"t":"hello","v":${v},"world":"town","skin":5,"at":[3,4]}`)).toEqual({ t: 'hello', v, world: 'town', skin: 5, at: [3, 4], name: '' });
    // An old client sends no skin: it gets through, so that the server can tell it to reload.
    expect(parseClientMessage(`{"t":"hello","v":${v},"world":"town","skin":5,"name":" Ana "}`)).toEqual({ t: 'hello', v, world: 'town', skin: 5, name: 'Ana' });
    expect(parseClientMessage('{"t":"hello","v":1,"world":"town"}')).toEqual({ t: 'hello', v: 1, world: 'town', skin: 0, name: '' });
    expect(parseClientMessage('{"t":"in","s":1,"i":[[100,-100],[0,0]],"d":[[2,5,6,1]]}')).toEqual({
      t: 'in',
      s: 1,
      i: [
        [100, -100],
        [0, 0],
      ],
      d: [[2, 5, 6, 1]],
    });
    for (const bad of [
      'nonsense',
      '[]',
      'null',
      '{"t":"in","s":0,"i":[[0,0]]}',
      '{"t":"in","s":1,"i":[]}',
      '{"t":"in","s":1,"i":[[101,0]]}',
      '{"t":"in","s":1,"i":[[0.5,0]]}',
      `{"t":"in","s":1,"i":${JSON.stringify(Array(MAX_INPUTS_PER_MESSAGE + 1).fill([0, 0]))}}`,
      '{"t":"in","s":1,"i":[[0,0]],"d":[[1,5,6,2]]}',
      `{"t":"hello","v":${v},"world":"town","skin":1,"at":[1e9,0]}`,
      `{"t":"hello","v":${v},"world":"town"}`,
      `{"t":"hello","v":${v},"world":"town","skin":-1}`,
      `{"t":"hello","v":${v},"world":"town","skin":4294967296}`,
      `{"t":"hello","v":${v},"world":"town","skin":1.5}`,
      '{"t":"ping","c":"x"}',
      '{"t":"welcome"}',
    ]) {
      expect(parseClientMessage(bad), bad).toBeNull();
    }
  });

  it('sends inputs as whole numbers and applies exactly what it sends', () => {
    expect(toWireInput({ x: 0.707, y: -0.707 })).toEqual([71, -71]);
    const back = fromWireInput([71, -71]);
    expect(Math.hypot(back.x, back.y)).toBeLessThanOrEqual(1);
    expect(fromWireInput(toWireInput(NO_INPUT))).toEqual({ x: 0, y: 0 });
  });
});

describe('a multiplayer room', () => {
  it('keeps every prediction exact on a clean network, with walls and latency', () => {
    for (const latency of [0, 40, 150]) {
      const net = new SimNetwork(latency);
      const a = new SimClient(wander(1));
      const b = new SimClient(wander(2));
      net.connect(a);
      net.connect(b);
      net.run(8000);
      for (const client of [a, b]) {
        const truth = net.room.player(client.id)!.state;
        expect(client.worstCorrection, `latency ${latency}`).toBeLessThan(1e-9);
        // The client is ahead of the server by its unconfirmed inputs; it is never far.
        expect(Math.hypot(client.player.x - truth.x, client.player.y - truth.y)).toBeLessThan(((2 * latency + SNAPSHOT_MS) / 1000) * 80 + 2);
      }
    }
  });

  it('shows each player to the other, close behind the truth', () => {
    const net = new SimNetwork(50);
    const a = new SimClient(wander(3));
    const b = new SimClient(wander(4));
    net.connect(a);
    net.connect(b);
    net.run(5000);
    const seen = b.remotes.at(net.nowMs);
    expect(seen.map((r) => r.id)).toEqual([a.id]);
    const truth = net.room.player(a.id)!.state;
    // Drawn about 50 ms latency + 100 ms delay + up to one snapshot in the past: 80 px/s at most.
    expect(Math.hypot(seen[0]!.x - truth.x, seen[0]!.y - truth.y)).toBeLessThan(0.25 * 80 + 1);
  });

  it('does not let a fast clock make a player faster', () => {
    const net = new SimNetwork(30);
    const cheat = new SimClient(() => ({ x: 1, y: 0 }), 2);
    const fair = new SimClient(() => ({ x: 1, y: 0 }));
    net.connect(cheat, [0, 20]);
    net.connect(fair, [0, 24]);
    // The burst lets a late batch through once; after it, only the rate counts.
    net.run(3000);
    const x = (c: SimClient) => net.room.player(c.id)!.state.x;
    const [cheat0, fair0] = [x(cheat), x(fair)];
    net.run(4000);
    expect(x(cheat) - cheat0).toBeLessThan(1.12 * (x(fair) - fair0));
    // And the cheating client is pulled back to the truth by its snapshots.
    expect(Math.abs(cheat.player.x - x(cheat))).toBeLessThan(80 * 0.3);
  });

  it('ignores a repeated batch of inputs', () => {
    const room = new Room(new World(houseSource()));
    const p = room.join(0, 1)!;
    const message: InputMessage = { t: 'in', s: 1, i: Array(INPUT_BATCH_TICKS).fill(toWireInput({ x: 1, y: 0 })) };
    room.input(p.id, message, 0);
    const x = p.state.x;
    room.input(p.id, message, 100);
    expect(p.state.x).toBe(x);
    expect(p.seq).toBe(INPUT_BATCH_TICKS);
  });

  it('shows each player in the skin that its client chose, and refuses players when full', () => {
    const room = new Room(new World(houseSource()), { maxPlayers: 2 });
    const a = room.join(0, 4_000_000_000)!;
    const b = room.join(0, 7)!;
    expect(room.join(0, 9)).toBeNull();
    const seen = new Map<number, SnapshotMessage>();
    room.broadcast(0, (id, m) => seen.set(id, m));
    expect(seen.get(a.id)!.p.map((p) => [p[0], p[6]])).toEqual([[b.id, 7]]);
    expect(seen.get(b.id)!.p.map((p) => [p[0], p[6]])).toEqual([[a.id, 4_000_000_000]]);
  });

  it('shares a door: one player opens it and the other sees it open', () => {
    const net = new SimNetwork(40);
    const a = new SimClient(north);
    const b = new SimClient(() => NO_INPUT);
    net.connect(a, [5, 8]);
    net.connect(b, [10, 10]);
    net.run(1000);
    // a has walked up to the closed door and stands against it.
    expect(a.world.isDoorOpen(5, 6)).toBe(false);
    expect(a.prediction.door(a.player, a.world, 5, 6, [])).toBe('opened');
    expect(a.world.isDoorOpen(5, 6)).toBe(true);
    net.run(1500);
    expect(net.room.world.isDoorOpen(5, 6)).toBe(true);
    expect(b.world.isDoorOpen(5, 6)).toBe(true);
    // a walked on through the door, into the house, with no correction.
    expect(a.player.y).toBeLessThan(6 * TILE_SIZE);
    expect(a.worstCorrection).toBeLessThan(1e-9);
  });

  it('refuses a door wish from far away, and the client takes the truth back', () => {
    const net = new SimNetwork(40);
    const a = new SimClient(() => NO_INPUT);
    net.connect(a, [12, 12]);
    net.run(500);
    // Out of reach: a real client never asks, but the server must not trust it.
    a.prediction.door(a.player, a.world, 5, 6, []);
    expect(a.world.isDoorOpen(5, 6)).toBe(true);
    net.run(1000);
    expect(net.room.world.isDoorOpen(5, 6)).toBe(false);
    expect(a.world.isDoorOpen(5, 6)).toBe(false);
  });

  it('does not close a door on another player in the doorway', () => {
    const room = new Room(new World(houseSource()));
    room.world.setDoorOpen(5, 6, true);
    const inside = room.join(0, 1, [5, 6])!;
    // findSpawn put `inside` on the open doorway tile; `outside` stands just south of it.
    expect(Math.floor(inside.state.y / TILE_SIZE)).toBe(6);
    const outside = room.join(0, 2, [5, 7])!;
    outside.state.y = 7 * TILE_SIZE + 4;
    room.input(outside.id, { t: 'in', s: 1, i: [[0, 0]], d: [[1, 5, 6, 0]] }, 0);
    expect(room.world.isDoorOpen(5, 6)).toBe(true);
    room.leave(inside.id);
    room.input(outside.id, { t: 'in', s: 2, i: [[0, 0]], d: [[2, 5, 6, 0]] }, 20);
    expect(room.world.isDoorOpen(5, 6)).toBe(false);
  });

  it('sends the doors only when they change', () => {
    const room = new Room(new World(houseSource()));
    const p = room.join(0, 1)!;
    const doorsOf = () => {
      let found: SnapshotMessage | null = null;
      room.broadcast(0, (_, m) => (found = m));
      return (found as SnapshotMessage | null)?.doors;
    };
    expect(doorsOf()).toBeUndefined();
    p.state.x = 5 * TILE_SIZE + 8;
    p.state.y = 7 * TILE_SIZE + 4;
    room.input(p.id, { t: 'in', s: 1, i: [[0, 0]], d: [[1, 5, 6, 1]] }, 0);
    expect(doorsOf()).toEqual([[5, 6]]);
    expect(doorsOf()).toBeUndefined();
  });
});

describe('the other players on a client', () => {
  it('interpolates between snapshots, in the past, and forgets a player that left', () => {
    const remotes = new Remotes();
    const snap = (ms: number, x: number): SnapshotMessage => ({ t: 'snap', ms, a: 0, you: [0, 0, 0, 0, 0, 0, 0, 0, 0], p: [[7, x, 50, 80, 0, 3, 2, 0, 0, 0]] });
    remotes.apply(snap(1000, 0), 5000);
    remotes.apply(snap(1050, 4), 5050);
    remotes.apply(snap(1100, 8), 5100);
    // At local 5175 the client draws server time 1075: halfway between the last two snapshots.
    const [r] = remotes.at(5175);
    expect(r).toMatchObject({ id: 7, skin: 2, x: 6, y: 50, facing: 'right' });
    // Later than the last snapshot, it stays there and does not guess.
    expect(remotes.at(9000)[0]!.x).toBe(8);
    remotes.apply({ t: 'snap', ms: 1150, a: 0, you: [0, 0, 0, 0, 0, 0, 0, 0, 0], p: [] }, 5150);
    expect(remotes.count).toBe(0);
  });
});

describe('a new look in the middle of a visit', () => {
  it('reads a skin message, and refuses a skin that is not a 32-bit whole number', () => {
    expect(parseClientMessage('{"t":"skin","skin":123}')).toEqual({ t: 'skin', skin: 123 });
    for (const bad of ['{"t":"skin"}', '{"t":"skin","skin":-1}', '{"t":"skin","skin":4294967296}', '{"t":"skin","skin":"7"}']) {
      expect(parseClientMessage(bad), bad).toBeNull();
    }
  });

  it('shows the new skin to the others, at most one change every 2 seconds (the last one wins)', () => {
    const room = new Room(new World(houseSource()));
    const a = room.join(0, 1)!;
    const b = room.join(0, 2)!;
    const seenByB = (ms: number) => {
      let skin = -1;
      room.broadcast(ms, (id, m) => {
        if (id === b.id) skin = m.p.find((p) => p[0] === a.id)![6];
      });
      return skin;
    };
    room.setSkin(a.id, 10, 1000);
    expect(seenByB(1000)).toBe(10);
    room.setSkin(a.id, 11, 1500);
    room.setSkin(a.id, 12, 1800);
    expect(seenByB(2000)).toBe(10);
    expect(seenByB(3000)).toBe(12);
  });
});

describe('names', () => {
  it('keep letters (with accents), digits, spaces and a few marks, and at most 16 characters', () => {
    expect(cleanName('  Fede   del  Río ')).toBe('Fede del Río');
    expect(cleanName('<script>alert(1)</script>')).toBe('scriptalert1scri');
    expect(cleanName('a'.repeat(40))).toHaveLength(16);
    expect(cleanName("Zoë_O'Neil-2.0")).toBe("Zoë_O'Neil-2.0");
    expect(cleanName('名前 🙂')).toBe('');
    expect(parseClientMessage('{"t":"name","name":"  Ana  "}')).toEqual({ t: 'name', name: 'Ana' });
    expect(parseClientMessage(`{"t":"name","name":"${'x'.repeat(100)}"}`)).toBeNull();
  });

  it('reach the others in a roster, only when a name changes', () => {
    const room = new Room(new World(houseSource()));
    const a = room.join(0, 1, undefined, 'Ana')!;
    const rosters: (readonly (readonly [number, string])[] | undefined)[] = [];
    const b = room.join(0, 2)!;
    const rosterForB = (ms: number) => {
      let names: readonly (readonly [number, string])[] | undefined;
      room.broadcast(ms, (id, m) => {
        if (id === b.id) names = m.names;
      });
      rosters.push(names);
      return names;
    };
    expect(rosterForB(0)).toEqual([[a.id, 'Ana']]);
    expect(rosterForB(50)).toBeUndefined();
    room.setName(a.id, 'Ana María');
    expect(rosterForB(100)).toEqual([[a.id, 'Ana María']]);
    room.setName(b.id, 'Bo');
    expect(rosterForB(150)).toEqual([[a.id, 'Ana María'], [b.id, 'Bo']]);
    room.leave(a.id);
    expect(rosterForB(200)).toEqual([[b.id, 'Bo']]);
  });
});

describe('mobs in a shared world', () => {
  it('reads attacks in inputs, and refuses a bad side or a bad view time', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0, 4]], k: [[1, 12345.5]] }))).toEqual({ t: 'in', s: 1, i: [[0, 0, 4]], k: [[1, 12345.5]] });
    expect(fromWireInput([100, 0, 2])).toEqual({ x: 1, y: 0, attack: 'up' });
    expect(toWireInput({ x: 0, y: 0, attack: 'right' })).toEqual([0, 0, 4]);
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0, 5]] }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0]], k: [[1, 'soon']] }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'in', s: 1, i: [[0, 0]], k: Array.from({ length: 5 }, () => [1, 0]) }))).toBeNull();
  });

  it('kill a mob that a client strikes, and every client sees it die', () => {
    const net = new SimNetwork(40, mobHouseSource);
    let attackAt = -1;
    const a = new SimClient((tick) => (tick === attackAt ? { x: 0, y: 0, attack: 'right' } : NO_INPUT), 1, mobHouseSource);
    const b = new SimClient(() => NO_INPUT, 1, mobHouseSource);
    net.connect(a, [5, 10]);
    net.connect(b, [5, 12]);
    net.run(400);
    const p = net.room.player(a.id)!.state;
    const mob = net.room.horde!.spawn('imp', p.x + 18, p.y);
    net.run(300);
    attackAt = a.ticks + 1;
    net.run(600);
    expect(net.room.kills).toBe(1);
    expect(mob.state).toBe('dying');
    // B was told: it draws the mob dying (100 ms in the past).
    const seen = b.remotes.mobsAt(net.nowMs).find((m) => m.id === mob.id);
    expect(seen?.state).toBe('dying');
    // And B saw A strike.
    expect(net.room.player(a.id)!.state.cooldown).toBe(0);
  });

  it('let a blow land where the client showed the mob, but not long before', () => {
    const room = new Room(new World(mobHouseSource()));
    const p = room.join(0, 1, [5, 10])!;
    const horde = room.horde!;
    const mob = horde.spawn('imp', p.state.x + 18, p.state.y);
    room.tick(1000);
    room.tick(1050);
    // The mob runs off to the east: out of reach now, in reach at 1050.
    mob.x += 60;
    room.tick(1100);
    room.tick(1150);
    room.input(p.id, { t: 'in', s: 1, i: [[0, 0, 4]], k: [[1, 1050]] }, 1160);
    expect(room.kills).toBe(1);
    // Another mob, the same way, but the client claims a view of long ago: it does not count.
    const other = horde.spawn('imp', p.state.x + 18, p.state.y);
    room.tick(2000);
    other.x += 60;
    room.tick(2050);
    room.tick(2700);
    room.tick(2750);
    for (let i = 2; i < 40; i++) room.input(p.id, { t: 'in', s: i, i: [[0, 0]] }, 2750);
    room.input(p.id, { t: 'in', s: 40, i: [[0, 0, 4]], k: [[40, 2000]] }, 2760);
    expect(room.kills).toBe(1);
  });

  it('stun a client with a hit, and its prediction stands still until the stun is over', () => {
    const net = new SimNetwork(50, mobHouseSource);
    // The client runs east all the time; an imp comes from the west, and it is faster.
    const a = new SimClient(() => ({ x: 1, y: 0 }), 1, mobHouseSource);
    net.connect(a, [5, 12]);
    net.run(300);
    const p = net.room.player(a.id)!.state;
    net.room.horde!.spawn('imp', p.x - 40, p.y);
    let stunnedAt = -1;
    let xAtStun = 0;
    let movedWhileStunned = 0;
    for (let t = 0; t < 8000 && stunnedAt < 0; t += 20) {
      net.run(20);
      if (a.player.stun > 0) {
        stunnedAt = net.nowMs;
        xAtStun = a.player.x;
      }
    }
    expect(net.room.hits).toBeGreaterThanOrEqual(1);
    expect(stunnedAt).toBeGreaterThan(0);
    while (a.player.stun > 1) {
      net.run(10);
      movedWhileStunned = Math.max(movedWhileStunned, Math.abs(a.player.x - xAtStun));
    }
    expect(movedWhileStunned).toBeLessThan(1);
    // The client and the server agree on the stun: no big correction.
    expect(a.worstCorrection).toBeLessThan(12);
  });

  it('send only the mobs near each player', () => {
    const room = new Room(new World(mobHouseSource()));
    const p = room.join(0, 1, [5, 10])!;
    room.horde!.spawn('imp', p.state.x + 40, p.state.y);
    room.horde!.spawn('brute', p.state.x + MOB_SEND_RADIUS + 50, p.state.y);
    room.tick(10);
    room.tick(60);
    let snap: SnapshotMessage | null = null;
    room.broadcast(100, (_id, message) => (snap = message));
    expect(snap!.m!.map((m) => m[1])).toEqual([0]);
    expect(snap!.you).toHaveLength(9);
  });
});
