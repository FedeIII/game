import {
  PROTOCOL_VERSION,
  Prediction,
  Remotes,
  TILE_SIZE,
  parseServerMessage,
  stepPlayer,
  useDoor,
  type ClientMessage,
  type DoorResult,
  type MoveInput,
  type NpcPose,
  type PlayerState,
  type RefusalReason,
  type RemotePlayer,
  type ServerMessage,
  type World,
} from '@game/engine';

/** connecting: no welcome yet; online: in the shared world; offline: waiting to try again; refused: the server said no. */
export type NetStatus = 'connecting' | 'online' | 'offline' | 'refused';

/** With more unconfirmed inputs than this (5 s), the connection has stalled: start a new one. */
const MAX_UNCONFIRMED = 300;
const PING_INTERVAL_MS = 2000;
const RETRY_FIRST_MS = 1000;
const RETRY_MAX_MS = 30_000;
/** A page that is hidden this long leaves the shared world; it comes back when it is shown. */
const HIDDEN_LEAVE_MS = 60_000;
/** A correction longer than this is a jump (a new start point), not something to smooth. */
const MAX_SMOOTHED_CORRECTION = 2 * TILE_SIZE;

/** The URL of the multiplayer server: /ws on the page's own host. */
export function serverUrl(): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/**
 * The connection of a page to the multiplayer server, for one shared world. While it is online,
 * the local player moves by prediction (Prediction) and the others come from snapshots
 * (Remotes). While it is not, the player moves alone, as in a single-player world, and the
 * session tries again: so the game never stops for the network.
 */
export class NetSession {
  status: NetStatus = 'connecting';
  refusal: RefusalReason | null = null;
  /** The last round trip to the server, for the debug panel. */
  rttMs: number | null = null;
  private readonly worldId: string;
  private skin: number;
  private name: string;
  private readonly player: PlayerState;
  private readonly world: World;
  private readonly url: string;
  private readonly prediction = new Prediction();
  private readonly remotes = new Remotes();
  private readonly listeners: (() => void)[] = [];
  private readonly barkListeners: ((barks: readonly (readonly [number, number])[]) => void)[] = [];
  private socket: WebSocket | null = null;
  private retryMs = RETRY_FIRST_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private hiddenTimer: ReturnType<typeof setTimeout> | null = null;
  private nextPingMs = 0;
  /** The jump of the local player's position from reconciliations, not yet given to the view. */
  private jump = { x: 0, y: 0 };

  constructor(worldId: string, skin: number, name: string, player: PlayerState, world: World, url = serverUrl()) {
    this.worldId = worldId;
    this.skin = skin;
    this.name = name;
    this.player = player;
    this.world = world;
    this.url = url;
    document.addEventListener('visibilitychange', () => this.visibility());
    this.connect();
  }

  /** Calls `listener` with the lines that the server's NPCs say: [npc index, line index]. */
  onBarks(listener: (barks: readonly (readonly [number, number])[]) => void): void {
    this.barkListeners.push(listener);
  }

  /** Calls `listener` when the status or the number of others changes. */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  /** The number of other players in the shared world. */
  get others(): number {
    return this.status === 'online' ? this.remotes.count : 0;
  }

  /** One tick of the local player. */
  tick(input: MoveInput): void {
    if (this.status !== 'online') {
      stepPlayer(this.player, input, this.world);
      return;
    }
    this.prediction.step(this.player, this.world, input);
    const batch = this.prediction.takeBatch();
    if (batch) this.send(batch);
    const now = performance.now();
    if (now >= this.nextPingMs) {
      this.nextPingMs = now + PING_INTERVAL_MS;
      this.send({ t: 'ping', c: now });
    }
    if (this.prediction.unconfirmed > MAX_UNCONFIRMED) this.socket?.close();
  }

  /** Opens or closes a door: at once here, and through the server for everyone. */
  door(tx: number, ty: number, others: readonly PlayerState[]): DoorResult {
    if (this.status !== 'online') return useDoor(this.world, this.player, tx, ty);
    return this.prediction.door(this.player, this.world, tx, ty, others);
  }

  /** The other players to draw now. */
  playersAt(nowMs: number): RemotePlayer[] {
    return this.status === 'online' ? this.remotes.at(nowMs) : [];
  }

  /** The visitor chose a new look: the others see it (and a reconnection keeps it). */
  setSkin(skin: number): void {
    this.skin = skin;
    if (this.status === 'online') this.send({ t: 'skin', skin });
  }

  /** The visitor chose a name ('' for none): the others see it over the player's head. */
  setName(name: string): void {
    this.name = name;
    if (this.status === 'online') this.send({ t: 'name', name });
  }

  /** Whether the NPCs come from the server now (online, in a world with NPCs). */
  get serverNpcs(): boolean {
    return this.status === 'online' && this.remotes.hasNpcs;
  }

  /** The NPCs to draw now, from the server. */
  npcsAt(nowMs: number): NpcPose[] {
    return this.remotes.npcsAt(nowMs);
  }

  /**
   * How far the local player jumped since the last call, from corrections by the server. The
   * view moves its interpolation by this much and hides it over a few frames.
   */
  takeJump(): { x: number; y: number; smooth: boolean } {
    const jump = this.jump;
    this.jump = { x: 0, y: 0 };
    return { ...jump, smooth: Math.hypot(jump.x, jump.y) <= MAX_SMOOTHED_CORRECTION };
  }

  private connect(): void {
    this.retryTimer = null;
    this.status = 'connecting';
    this.changed();
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch {
      this.retry(false);
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      // Start where the player is now, so a reconnection does not move anyone.
      const at = [Math.floor(this.player.x / TILE_SIZE), Math.floor(this.player.y / TILE_SIZE)] as const;
      this.send({ t: 'hello', v: PROTOCOL_VERSION, world: this.worldId, skin: this.skin, at, name: this.name });
    };
    socket.onmessage = (event) => {
      const message = typeof event.data === 'string' ? parseServerMessage(event.data) : null;
      if (message) this.receive(message);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.remotes.clear();
      if (this.status === 'refused') {
        this.changed();
        return;
      }
      // 1012: the server restarts (a deploy). Come back at once.
      this.retry(event.code === 1012 || event.code === 1001);
    };
  }

  private receive(message: ServerMessage): void {
    const now = performance.now();
    switch (message.t) {
      case 'welcome': {
        const before = { x: this.player.x, y: this.player.y };
        this.prediction.reset(this.player, this.world, message);
        this.addJump(this.player.x - before.x, this.player.y - before.y);
        this.status = 'online';
        this.retryMs = RETRY_FIRST_MS;
        this.nextPingMs = now;
        this.changed();
        return;
      }
      case 'snap': {
        const count = this.remotes.count;
        const others = [...this.remotes.at(now), ...this.remotes.npcsAt(now)];
        const { dx, dy } = this.prediction.reconcile(this.player, this.world, message, others);
        this.addJump(dx, dy);
        this.remotes.apply(message, now);
        if (this.remotes.count !== count) this.changed();
        if (message.b) for (const listener of this.barkListeners) listener(message.b);
        return;
      }
      case 'refused':
        this.status = 'refused';
        this.refusal = message.reason;
        this.changed();
        return;
      case 'pong':
        this.rttMs = now - message.c;
        return;
    }
  }

  private addJump(dx: number, dy: number): void {
    this.jump.x += dx;
    this.jump.y += dy;
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private retry(soon: boolean): void {
    this.status = 'offline';
    this.changed();
    if (document.hidden || this.retryTimer) return;
    const wait = soon ? 300 + Math.random() * 700 : this.retryMs * (0.75 + Math.random() * 0.5);
    this.retryMs = Math.min(RETRY_MAX_MS, this.retryMs * 2);
    this.retryTimer = setTimeout(() => this.connect(), wait);
  }

  /** A hidden page leaves after a while, so it does not stand in the world for hours; it comes back when shown. */
  private visibility(): void {
    if (document.hidden) {
      this.hiddenTimer ??= setTimeout(() => {
        this.hiddenTimer = null;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        const socket = this.socket;
        this.socket = null;
        socket?.close(1000, 'hidden');
        this.remotes.clear();
        if (this.status !== 'refused') {
          this.status = 'offline';
          this.changed();
        }
      }, HIDDEN_LEAVE_MS);
      return;
    }
    if (this.hiddenTimer) clearTimeout(this.hiddenTimer);
    this.hiddenTimer = null;
    if (this.status === 'offline' && !this.socket && !this.retryTimer) {
      this.retryMs = RETRY_FIRST_MS;
      this.connect();
    }
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
