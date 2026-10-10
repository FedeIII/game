import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { performance } from 'node:perf_hooks';
import { WebSocket, WebSocketServer } from 'ws';
import {
  MAX_CLIENT_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  Room,
  SNAPSHOT_RATE,
  World,
  characterSkin,
  sheetTraits,
  exploredList,
  parseClientMessage,
  type ClientMessage,
  type RefusalReason,
  type ServerMessage,
  type WorldDefinition,
  type JoinCharacter,
} from '@game/engine';
import { Accounts, type AccountsOptions } from './accounts.ts';
import type { User } from './store.ts';

export { Accounts, type AccountsOptions, type PlaceWorlds } from './accounts.ts';
export { AccountStore, type User } from './store.ts';
export type { GoogleConfig } from './google.ts';

/**
 * The multiplayer server of the engine: one Room for each world of the application that has
 * `multiplayer: true`, behind one WebSocket endpoint, /ws. It runs in Node, behind nginx (which
 * terminates TLS and sets X-Forwarded-For). See docs/multiplayer.md. With `accounts`, it also
 * answers /api/ and /auth/ (accounts.ts), and a player in a shared world must be signed in and
 * play one of its own characters.
 */

export interface ServerOptions {
  /** The worlds of the application. The server hosts those with `multiplayer: true`. */
  readonly worlds: readonly WorldDefinition[];
  readonly port: number;
  /** Default 127.0.0.1: only nginx connects. */
  readonly host?: string;
  /**
   * The pages that may connect: the Origin header must be one of these. null accepts any origin;
   * use it only in tests.
   */
  readonly origins: readonly string[] | null;
  /** Players per world. Default 50. */
  readonly maxPlayers?: number;
  /** Connections from one address (tabs, people behind one router). Default 8. */
  readonly maxPerAddress?: number;
  /** Accounts, sessions and characters (accounts.ts). Without it: no /api/ and no /auth/. */
  readonly accounts?: AccountsOptions;
  readonly log?: (line: string) => void;
}

export interface GameServer {
  /** The port it listens on (useful with port 0). */
  readonly port: number;
  /** The number of players in each multiplayer world. */
  players(): Record<string, number>;
  /** The accounts, if the server has them. */
  readonly accounts: Accounts | null;
  /** Closes every connection (code 1012: the clients come back) and stops. */
  close(): Promise<void>;
}

/**
 * The server pings every client this often; a client without a pong since the last ping is
 * dropped. At the same time it saves where each character is (a shared world, with accounts).
 */
const PING_INTERVAL_MS = 25_000;
/** A client that has not said hello this long after it connected is dropped. */
const HELLO_TIMEOUT_MS = 10_000;
/** The expected rate is 20 input batches a second, and a ping now and then. */
const MAX_MESSAGES_PER_SECOND = 60;
/** A client whose send buffer holds more than this gets no snapshots until it empties. */
const MAX_BUFFERED_BYTES = 256 * 1024;
const TRIM_INTERVAL_MS = 10_000;

interface Client {
  readonly ip: string;
  /** The signed-in user of the connection (its session cookie), on a server with accounts. */
  readonly user: User | null;
  /** The token of that session: a sign-in on another device ends it, and the connection with it. */
  readonly token: string | null;
  /** The id of the character that it plays, on a server with accounts. */
  character: string | null;
  room: Room | null;
  world: string;
  playerId: number;
  alive: boolean;
  windowStartMs: number;
  messages: number;
}

/**
 * The address of the visitor. nginx SETS X-Forwarded-For to $remote_addr (it does not append),
 * so the first value is the visitor; taking [0] means a proxy that appends degrades to too
 * strict a limit, not to no limit.
 */
function addressOf(request: IncomingMessage): string {
  const forwarded = request.headers['x-forwarded-for'];
  const first = forwarded ? String(forwarded).split(',')[0]!.trim() : '';
  return first || request.socket.remoteAddress || 'unknown';
}

export async function startServer(options: ServerOptions): Promise<GameServer> {
  const log = options.log ?? ((line: string) => console.log(`[game-server] ${line}`));
  const maxPerAddress = options.maxPerAddress ?? 8;
  const now = () => performance.now();

  const rooms = new Map<string, Room>();
  const sockets = new Map<Room, Map<number, WebSocket>>();
  for (const definition of options.worlds) {
    if (!definition.multiplayer) continue;
    const room = new Room(new World(definition.createSource(null)), { maxPlayers: options.maxPlayers ?? 50, random: Math.random });
    rooms.set(definition.id, room);
    sockets.set(room, new Map());
  }
  const perAddress = new Map<string, number>();
  const clients = new Map<WebSocket, Client>();
  const players = () => Object.fromEntries([...rooms].map(([id, room]) => [id, room.size]));
  const accounts = options.accounts
    ? new Accounts(options.accounts, options.origins, log, { all: new Set(options.worlds.map((w) => w.id)), shared: new Set(rooms.keys()) })
    : null;

  const send = (socket: WebSocket, message: ServerMessage) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };

  const http = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, protocol: PROTOCOL_VERSION, players: players(), accounts: accounts !== null }));
      return;
    }
    const notFound = () => {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found\n');
    };
    if (!accounts) return notFound();
    accounts.handle(request, response).then(
      (answered) => {
        if (!answered) notFound();
      },
      (error: unknown) => {
        log(`http: ${(error as Error).stack ?? String(error)}`);
        if (!response.headersSent) response.writeHead(500);
        response.end();
      },
    );
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_CLIENT_MESSAGE_BYTES });

  http.on('upgrade', (request, socket, head) => {
    const reject = (status: string) => {
      socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    };
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (pathname !== '/ws') return reject('404 Not Found');
    // Only the game's own pages: another site must not make its visitors connect here.
    if (options.origins && !options.origins.includes(String(request.headers.origin ?? ''))) return reject('403 Forbidden');
    // The session cookie comes with the upgrade (the page and /ws have one origin).
    const session = accounts?.sessionOf(request) ?? null;
    wss.handleUpgrade(request, socket, head, (ws) => connected(ws, addressOf(request), session?.user ?? null, session?.token ?? null));
  });

  // A sign-in ends the account's other sessions: their connections end too. The character's place
  // is saved as the connection closes, so the new device goes on from there.
  accounts?.onSignIn((user) => {
    for (const [socket, client] of clients) {
      if (client.user?.id !== user.id || !client.token || accounts.sessionLives(client.token)) continue;
      send(socket, { t: 'refused', reason: 'elsewhere' });
      socket.close(4001, 'elsewhere');
    }
  });

  function connected(socket: WebSocket, ip: string, user: User | null, token: string | null): void {
    perAddress.set(ip, (perAddress.get(ip) ?? 0) + 1);
    const client: Client = { ip, user, token, character: null, room: null, world: '', playerId: 0, alive: true, windowStartMs: now(), messages: 0 };
    clients.set(socket, client);
    const helloTimer = setTimeout(() => {
      if (!client.room) socket.close(4000, 'no hello');
    }, HELLO_TIMEOUT_MS);

    socket.on('pong', () => {
      client.alive = true;
    });
    socket.on('message', (data, isBinary) => {
      const t = now();
      if (t - client.windowStartMs >= 1000) {
        client.windowStartMs = t;
        client.messages = 0;
      }
      if (++client.messages > MAX_MESSAGES_PER_SECOND) return socket.close(1008, 'too many messages');
      const message = isBinary ? null : parseClientMessage(data.toString());
      if (!message) return socket.close(1008, 'bad message');
      handle(socket, client, message, t);
    });
    socket.on('close', () => {
      clearTimeout(helloTimer);
      left(socket, client);
    });
    socket.on('error', () => socket.terminate());
  }

  function handle(socket: WebSocket, client: Client, message: ClientMessage, t: number): void {
    if (message.t === 'ping') return send(socket, { t: 'pong', c: message.c });
    if (message.t === 'hello') {
      if (client.room) return socket.close(1008, 'hello twice');
      const refuse = (reason: RefusalReason) => {
        send(socket, { t: 'refused', reason });
        socket.close(4001, reason);
      };
      if (message.v !== PROTOCOL_VERSION) return refuse('version');
      const room = rooms.get(message.world);
      if (!room) return refuse('world');
      if ((perAddress.get(client.ip) ?? 0) > maxPerAddress) return refuse('busy');
      let skin = message.skin;
      let name = message.name;
      let place: { x: number; y: number } | undefined;
      let stored: JoinCharacter | undefined;
      if (accounts) {
        // The look, the name and the place of a player come from its stored character, not from the client.
        const character = client.user && message.character ? accounts.characterOf(client.user, message.character) : null;
        if (!character) return refuse('account');
        skin = characterSkin(character);
        name = character.name;
        if (character.place?.world === message.world) place = character.place;
        client.character = character.id;
        // What its scores give, and what it carries: from the stored character too.
        stored = { traits: sheetTraits(character), pack: character.pack, hp: character.hp, refuges: character.refuges, explored: character.explored };
      }
      const player = room.join(t, skin, message.at, name, place, stored);
      if (!player) return refuse('full');
      client.room = room;
      client.world = message.world;
      client.playerId = player.id;
      sockets.get(room)!.set(player.id, socket);
      send(socket, room.welcome(player));
      log(`${message.world}: a visitor came in (${room.size} here)`);
      return;
    }
    if (!client.room) return socket.close(1008, 'no hello');
    // With accounts, the character decides the look and the name: a change is ignored.
    if (message.t === 'skin') return accounts ? undefined : client.room.setSkin(client.playerId, message.skin, t);
    if (message.t === 'name') return accounts ? undefined : client.room.setName(client.playerId, message.name);
    if (message.t === 'deal') return client.room.deal(client.playerId, message, message.deal);
    if (message.t === 'drink') return client.room.drink(client.playerId, message.kind);
    client.room.input(client.playerId, message, t);
  }

  /** Notes where the character of a client is now, and what it carries (with accounts, in a room). */
  function savePlace(client: Client): void {
    const player = client.room?.player(client.playerId);
    if (!accounts || !client.user || !client.character || !player) return;
    try {
      accounts.savePlace(client.user, client.character, { world: client.world, x: player.state.x, y: player.state.y });
      accounts.savePack(client.user, client.character, player.pack);
      accounts.saveVitals(client.user, client.character, player.state.hp, player.refuges);
      accounts.saveExplored(client.user, client.character, exploredList(player.explored));
    } catch (error) {
      log(`place: ${(error as Error).message}`);
    }
  }

  function left(socket: WebSocket, client: Client): void {
    if (!clients.delete(socket)) return;
    const count = (perAddress.get(client.ip) ?? 1) - 1;
    if (count > 0) perAddress.set(client.ip, count);
    else perAddress.delete(client.ip);
    if (client.room) {
      // A player who lies defeated wakes first: the place and the coins that are saved are those after the defeat.
      client.room.settle(client.playerId);
      savePlace(client);
      client.room.leave(client.playerId);
      sockets.get(client.room)!.delete(client.playerId);
      log(`${client.world}: a visitor left (${client.room.size} here)`);
    }
  }

  const snapshots = setInterval(() => {
    const t = now();
    for (const room of rooms.values()) {
      // An empty room stands still: its NPCs wait for the next visitor.
      if (room.size === 0) continue;
      room.tick(t);
      const bySocket = sockets.get(room)!;
      room.broadcast(
        t,
        (id, message) => {
          const socket = bySocket.get(id);
          if (socket) send(socket, message);
        },
        (id) => (bySocket.get(id)?.bufferedAmount ?? 0) > MAX_BUFFERED_BYTES,
      );
    }
  }, 1000 / SNAPSHOT_RATE);

  const heartbeat = setInterval(() => {
    for (const [socket, client] of clients) {
      if (!client.alive) {
        socket.terminate();
        continue;
      }
      client.alive = false;
      socket.ping();
      // A crash loses at most this interval of walking.
      savePlace(client);
    }
  }, PING_INTERVAL_MS);

  const trim = setInterval(() => {
    for (const room of rooms.values()) room.trimChunks();
  }, TRIM_INTERVAL_MS);

  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(options.port, options.host ?? '127.0.0.1', () => resolve());
  });
  const port = (http.address() as AddressInfo).port;
  log(
    `listening on ${options.host ?? '127.0.0.1'}:${port}, worlds: ${[...rooms.keys()].join(', ') || 'none'}, accounts: ${
      accounts ? `on (${[options.accounts?.google ? 'google' : '', options.accounts?.devLogin ? 'dev' : ''].filter(Boolean).join(', ') || 'no sign-in'})` : 'off'
    }`,
  );

  return {
    port,
    players,
    accounts,
    async close() {
      clearInterval(snapshots);
      clearInterval(heartbeat);
      clearInterval(trim);
      // 1012 "service restart": the clients reconnect at once and keep their place.
      for (const socket of clients.keys()) socket.close(1012, 'restart');
      await new Promise((resolve) => setTimeout(resolve, 200));
      for (const socket of clients.keys()) socket.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => http.close(() => resolve()));
      accounts?.close();
    },
  };
}
