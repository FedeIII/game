import { MECHANICS, MOB_STATS, TILE_SIZE, wakePlayer, type BlowResult, type Horde, type Mechanic, type Mob, type MobHit, type MobKind, type MobRules, type PlayerState, type PlayerTraits, type World } from '@game/engine';

/**
 * The sandbox of an admin (Fede, 2026-10-15; docs/features/game/sandbox.md): a fight in a world that
 * the page runs, to test the mechanics of combat of the melee draft (docs/drafts/combat-melee.md) one
 * by one. The admin chooses a character in the menu ("Sandbox", in the main menu and in the game
 * menu); the character fights three foes (goblins at first) in a glade of the world
 * (WorldDefinition.sandbox), with SANDBOX_HP times its hit points, and the foes have FOE_HP times
 * theirs and never flee. When the character falls, the whole sandbox starts again with the same
 * character; when the foes fall, it starts again a moment later. Nothing is saved: not the place, the
 * pack, the gear, the hit points or the XP. The panel at the bottom left (ui/sandbox-panel.ts) turns
 * each mechanic on or off, chooses the foe and starts the fight again; this browser keeps that choice.
 */

/** The character has this many times its hit points. */
export const SANDBOX_HP = 10;
/** Each foe has this many times its hit points. */
export const FOE_HP = 5;
/** The number of foes in a fight. */
export const FOE_COUNT = 3;
/**
 * The kinds of foe that the panel offers: the goblins of the forest first (Fede's choice), and the
 * goblin archers (their arrows: a monk's Deflect Missiles, the reactions of the classes).
 */
export const SANDBOX_FOES = ['skirmisher', 'goblin', 'brute', 'bugbear', 'hobgoblin', 'worg', 'bandit'] as const satisfies readonly MobKind[];
export type SandboxFoe = (typeof SANDBOX_FOES)[number];
/** The foes come this far east of the character (tiles), already on their way to it. */
const FOE_TILES = 6;
/** After the last foe falls, the fight starts again this much later (ms). */
export const RESTART_MS = 2500;

/** What the admin chose in the panel: the kind of foe, and the mechanics that are on. */
export interface SandboxSettings {
  readonly foe: SandboxFoe;
  readonly mechanics: readonly Mechanic[];
}

export const DEFAULT_SANDBOX: SandboxSettings = { foe: 'skirmisher', mechanics: [] };

const KEY = 'game.sandbox.v1';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function local(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The choice that this browser kept; the default for nothing or for garbage. Unknown mechanics go. */
export function loadSandbox(storage: Store | null = local()): SandboxSettings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return DEFAULT_SANDBOX;
    const kept = JSON.parse(raw) as { foe?: unknown; mechanics?: unknown };
    const foe = SANDBOX_FOES.find((kind) => kind === kept.foe) ?? DEFAULT_SANDBOX.foe;
    const mechanics = Array.isArray(kept.mechanics) ? MECHANICS.filter((m) => (kept.mechanics as unknown[]).includes(m)) : [];
    return { foe, mechanics };
  } catch {
    return DEFAULT_SANDBOX;
  }
}

/** Keeps the choice in this browser. */
export function saveSandbox(settings: SandboxSettings, storage: Store | null = local()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(settings));
  } catch {
    // No storage (a private window): the choice holds until the page closes.
  }
}

/** The rules of the mobs of a world, without its population: in the sandbox no other mob comes. */
export function sandboxRules(rules: MobRules): MobRules {
  return { roam: (tx, ty) => rules.roam(tx, ty), hunt: (tx, ty) => rules.hunt(tx, ty), population: {} };
}

/** The traits of the character in the sandbox: SANDBOX_HP times its hit points. */
export function sandboxTraits(traits: PlayerTraits): PlayerTraits {
  return { ...traits, maxHp: traits.maxHp * SANDBOX_HP };
}

/** What happened in a fight: how it ended and how long it took, the blows of the character, the attacks of the foes. */
export interface FightLog {
  /** Whether the character won (every foe fell); null while the fight goes on. */
  won: boolean | null;
  /** How long the fight took (ms). */
  ms: number;
  /** The blows of the character that reached a foe, and those that hit. */
  blows: number;
  hits: number;
  /** The attacks of the foes that reached the character, those that hit, and the hit points that they took. */
  attacks: number;
  struck: number;
  damage: number;
}

const newLog = (): FightLog => ({ won: null, ms: 0, blows: 0, hits: 0, attacks: 0, struck: 0, damage: 0 });

/**
 * The fight of the sandbox: its foes, its start again, and what happened in it. The page calls start()
 * once, gives it the blows and the attacks of each tick, and calls tick() each tick.
 */
export class SandboxFight {
  /** The fights won and lost since the page started. */
  wins = 0;
  losses = 0;
  /** The last fight that ended, and the one that goes on. */
  last: FightLog | null = null;
  log: FightLog = newLog();
  /** The kind of the next foes. */
  foe: SandboxFoe;
  private foes: Mob[] = [];
  private startedAt = 0;
  /** When the fight starts again after a victory (ms), or null. */
  private againAt: number | null = null;
  private readonly horde: Horde;
  private readonly world: World;
  private readonly spot: { readonly x: number; readonly y: number };

  constructor(horde: Horde, world: World, spot: { readonly x: number; readonly y: number }, foe: SandboxFoe) {
    this.horde = horde;
    this.world = world;
    this.spot = spot;
    this.foe = foe;
  }

  /**
   * Starts the fight (again): the foes of the last fight go, the character stands at the spot with all
   * its hit points and stamina, and FOE_COUNT new foes come for it.
   */
  start(player: PlayerState, traits: PlayerTraits, now: number): void {
    this.horde.dismiss(this.horde.mobs.map((m) => m.id));
    this.horde.arrows.length = 0;
    wakePlayer(player, this.spot.x, this.spot.y, traits);
    player.facing = 'right';
    player.aim = 0;
    const tx = Math.floor(this.spot.x / TILE_SIZE) + FOE_TILES;
    const ty = Math.floor(this.spot.y / TILE_SIZE);
    this.foes = [];
    for (let i = 0; i < FOE_COUNT; i++) {
      const at = this.world.findSpawn(tx, ty + (i - 1) * 2, 0);
      const mob = this.horde.spawn(this.foe, at.x, at.y, { health: MOB_STATS[this.foe].health * FOE_HP, steady: true });
      this.horde.provoke(mob, 0, player);
      this.foes.push(mob);
    }
    this.startedAt = now;
    this.againAt = null;
    this.log = newLog();
  }

  /** The blows of the character in this tick (Horde.strike, the arrows' results). */
  blows(results: readonly BlowResult[]): void {
    for (const result of results) {
      this.log.blows++;
      if (result.damage > 0) this.log.hits++;
    }
  }

  /** The attacks of the foes on the character (player 0) in this tick (Horde.step). */
  attacks(hits: readonly MobHit[]): void {
    for (const [, id, damage] of hits) {
      if (id !== 0) continue;
      this.log.attacks++;
      if (damage > 0) {
        this.log.struck++;
        this.log.damage += damage;
      }
    }
  }

  /**
   * Each tick, after the mobs: the end of a fight. A defeat ends it at once (the character lies; the
   * page starts the fight again when it would wake: start()); a victory ends it when the last foe
   * falls, and it starts again RESTART_MS later. Returns true when it started again now.
   */
  tick(player: PlayerState, traits: PlayerTraits, now: number): boolean {
    if (this.log.won === null) {
      if (player.down > 0) this.end(false, now);
      else if (this.foes.every((m) => m.state === 'dying' || !this.horde.mobs.includes(m))) this.end(true, now);
    }
    if (this.againAt !== null && now >= this.againAt) {
      this.start(player, traits, now);
      return true;
    }
    return false;
  }

  private end(won: boolean, now: number): void {
    this.log.won = won;
    this.log.ms = now - this.startedAt;
    this.last = this.log;
    if (won) {
      this.wins++;
      this.againAt = now + RESTART_MS;
    } else this.losses++;
  }
}
