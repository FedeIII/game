import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { PROTOCOL_VERSION, type ServerMessage, type SnapshotMessage, type WorldDefinition } from '@game/engine';
import { houseSource } from '../../engine/test/helpers.ts';
import { startServer, type GameServer } from '../src/index.ts';

const shared: WorldDefinition = { id: 'shared', name: 'Shared', createSource: () => houseSource(), examine: {}, darkness: 0, multiplayer: true };
const solo: WorldDefinition = { id: 'solo', name: 'Solo', createSource: () => houseSource(), examine: {}, darkness: 0 };

let server: GameServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

async function start(extra: Partial<Parameters<typeof startServer>[0]> = {}): Promise<GameServer> {
  server = await startServer({ worlds: [shared, solo], port: 0, origins: null, log: () => {}, ...extra });
  return server;
}

/** A test client: every message it gets, and helpers to wait for one. */
class TestClient {
  readonly socket: WebSocket;
  readonly messages: ServerMessage[] = [];
  closed: { code: number } | null = null;
  readonly opened: Promise<void>;

  constructor(port: number, origin?: string) {
    this.socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, origin ? { origin } : {});
    this.socket.on('message', (data) => this.messages.push(JSON.parse(data.toString()) as ServerMessage));
    this.socket.on('close', (code) => (this.closed = { code }));
    this.opened = new Promise((resolve, reject) => {
      this.socket.once('open', () => resolve());
      this.socket.once('error', reject);
    });
  }

  send(message: unknown): void {
    this.socket.send(typeof message === 'string' ? message : JSON.stringify(message));
  }

  async until<T>(find: () => T | null | undefined | false, ms = 3000): Promise<T> {
    const end = Date.now() + ms;
    for (;;) {
      const found = find();
      if (found) return found;
      if (Date.now() > end) throw new Error('timed out');
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  last<K extends ServerMessage['t']>(t: K): Extract<ServerMessage, { t: K }> | undefined {
    return this.messages.filter((m): m is Extract<ServerMessage, { t: K }> => m.t === t).at(-1);
  }
}

async function joined(port: number, world = 'shared'): Promise<TestClient> {
  const client = new TestClient(port);
  await client.opened;
  client.send({ t: 'hello', v: PROTOCOL_VERSION, world });
  await client.until(() => client.last('welcome') ?? client.last('refused'));
  return client;
}

describe('the multiplayer server', () => {
  it('lets two visitors in and shows each to the other as they move', async () => {
    const { port } = await start();
    const a = await joined(port);
    const b = await joined(port);
    const welcomeA = a.last('welcome')!;
    expect(b.last('welcome')!.id).not.toBe(welcomeA.id);
    // a walks east for 30 ticks, in batches of 3.
    for (let s = 1; s <= 30; s += 3) a.send({ t: 'in', s, i: [[100, 0], [100, 0], [100, 0]] });
    const snap = await b.until(() => {
      const last = b.last('snap') as SnapshotMessage | undefined;
      const other = last?.p.find((p) => p[0] === welcomeA.id);
      return other && other[1] > welcomeA.x + 30 ? last : null;
    });
    expect(snap.p).toHaveLength(1);
    const ownA = await a.until(() => (a.last('snap')?.a === 30 ? a.last('snap') : null));
    expect(ownA.you[0]).toBeCloseTo(welcomeA.x + 40, 5);
    expect(server!.players()).toEqual({ shared: 2 });
    a.socket.close();
    await b.until(() => b.last('snap')?.p.length === 0);
    expect(server!.players()).toEqual({ shared: 1 });
  });

  it('refuses a client of another protocol version, and a world that is not shared', async () => {
    const { port } = await start();
    const old = new TestClient(port);
    await old.opened;
    old.send({ t: 'hello', v: PROTOCOL_VERSION + 1, world: 'shared' });
    expect((await old.until(() => old.last('refused'))).reason).toBe('version');
    const lost = await joined(port, 'solo');
    expect(lost.last('refused')!.reason).toBe('world');
    await lost.until(() => lost.closed);
  });

  it('closes on a message that is not valid, and refuses another site', async () => {
    const { port } = await start({ origins: ['https://game.azyr.io'] });
    const good = new TestClient(port, 'https://game.azyr.io');
    await good.opened;
    good.send('{"t":"in","s":1,"i":[[500,0]]}');
    expect((await good.until(() => good.closed)).code).toBe(1008);
    const evil = new TestClient(port, 'https://evil.example');
    await expect(evil.opened).rejects.toThrow(/403/);
  });

  it('limits the connections from one address', async () => {
    const { port } = await start({ maxPerAddress: 2 });
    const a = await joined(port);
    const b = await joined(port);
    const c = await joined(port);
    expect([a, b].map((x) => x.last('welcome') !== undefined)).toEqual([true, true]);
    expect(c.last('refused')!.reason).toBe('busy');
  });

  it('answers a ping and tells its health', async () => {
    const { port } = await start();
    const a = await joined(port);
    a.send({ t: 'ping', c: 123.5 });
    expect((await a.until(() => a.last('pong'))).c).toBe(123.5);
    const health = (await (await fetch(`http://127.0.0.1:${port}/healthz`)).json()) as { ok: boolean; players: Record<string, number> };
    expect(health).toMatchObject({ ok: true, players: { shared: 1 } });
  });
});
