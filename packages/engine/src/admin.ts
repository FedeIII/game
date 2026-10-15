import { TILE_SIZE } from './constants.ts';
import { MAX_XP } from './experience.ts';
import { ITEM_KINDS, MAX_COINS, type ItemKind, type Loot } from './items.ts';
import { MOB_KINDS, MOB_STATS, type Horde, type Mob, type MobKind } from './mobs.ts';
import type { PlayerState } from './player.ts';
import { QUEST_ID, type QuestBook, type QuestDef, type QuestEntry } from './quests.ts';
import type { SpawnFinder } from './world.ts';

/**
 * The tools of an admin (Fede's request, 2026-10-15; docs/features/game/admin-tools.md): the debug
 * controls of the section "Admin tools" in the settings of the game menu. An admin moves the hour of
 * a world, goes to a tile, gets items, coins and XP, puts mobs next to its character, and sets a quest
 * at a step. In a shared world the server applies a command only for an admin (the message `admin`,
 * protocol 49: Room.admin), and the hour changes for every player there; in a world that the page
 * runs, the page applies it to its own state.
 */
export type AdminCommand =
  /** The hour of the world's day (0 to 24) for everybody in the world, from now on; null: the real clock again. */
  | { readonly do: 'hour'; readonly hour: number | null }
  /** The character goes to the open tile nearest to this tile, on the ground storey. */
  | { readonly do: 'go'; readonly at: readonly [number, number] }
  /** Coins or items into the pack; what does not fit falls at the character's feet. */
  | { readonly do: 'give'; readonly kind: ItemKind | 'coins'; readonly count: number }
  /** The XP of the character: its level follows (experience.ts). */
  | { readonly do: 'xp'; readonly xp: number }
  /** Mobs of a kind beside the character (spawnBeside). */
  | { readonly do: 'mob'; readonly kind: MobKind; readonly count: number }
  /** A quest at a step (setQuestStep); null: the quest did not start. */
  | { readonly do: 'quest'; readonly quest: string; readonly step: string | null };

/**
 * The most of each command: items and mobs at once, and how far a tile may be from the middle of the
 * world. Coins: up to MAX_COINS (a full purse).
 */
export const ADMIN_LIMITS = { items: 99, mobs: 8, tile: 100_000 } as const;

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

/**
 * Reads a command from outside (a message of a client): null for anything that is not exactly a
 * valid command. The quest and its step are checked against the world's quests later (setQuestStep).
 */
export function checkAdminCommand(raw: unknown): AdminCommand | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  switch (c.do) {
    case 'hour':
      if (c.hour === null) return { do: 'hour', hour: null };
      return typeof c.hour === 'number' && Number.isFinite(c.hour) && c.hour >= 0 && c.hour <= 24 ? { do: 'hour', hour: c.hour } : null;
    case 'go': {
      const at = c.at;
      const limit = ADMIN_LIMITS.tile;
      return Array.isArray(at) && at.length === 2 && isInt(at[0], -limit, limit) && isInt(at[1], -limit, limit) ? { do: 'go', at: [at[0], at[1]] } : null;
    }
    case 'give': {
      if (c.kind === 'coins') return isInt(c.count, 1, MAX_COINS) ? { do: 'give', kind: 'coins', count: c.count } : null;
      const kind = ITEM_KINDS.find((k) => k === c.kind);
      return kind && isInt(c.count, 1, ADMIN_LIMITS.items) ? { do: 'give', kind, count: c.count } : null;
    }
    case 'xp':
      return isInt(c.xp, 0, MAX_XP) ? { do: 'xp', xp: c.xp } : null;
    case 'mob': {
      const kind = MOB_KINDS.find((k) => k === c.kind);
      return kind && isInt(c.count, 1, ADMIN_LIMITS.mobs) ? { do: 'mob', kind, count: c.count } : null;
    }
    case 'quest': {
      if (typeof c.quest !== 'string' || !QUEST_ID.test(c.quest)) return null;
      if (c.step === null) return { do: 'quest', quest: c.quest, step: null };
      return typeof c.step === 'string' && QUEST_ID.test(c.step) ? { do: 'quest', quest: c.quest, step: c.step } : null;
    }
    default:
      return null;
  }
}

/**
 * Moves a player to the open tile nearest to (tx, ty), on the ground storey, and stops its walk, its
 * roll and its jump. Its hit points, its stamina and the rest stay. False without an open tile there.
 */
export function teleport(state: PlayerState, world: SpawnFinder, tx: number, ty: number): boolean {
  let spot: { x: number; y: number };
  try {
    spot = world.findSpawn(tx, ty, 0);
  } catch {
    return false;
  }
  state.x = spot.x;
  state.y = spot.y;
  state.storey = 0;
  state.vx = 0;
  state.vy = 0;
  state.dodge = 0;
  state.jump = 0;
  return true;
}

/** What a command 'give' puts into the pack. */
export function adminLoot(kind: ItemKind | 'coins', count: number): Loot {
  return kind === 'coins' ? { coins: count, items: [] } : { coins: 0, items: [{ kind, count }] };
}

/**
 * The book with `quest` at `step` (null: the quest did not start, and its entry goes): the flags of the
 * quest stay, and the entry is the last that changed. Null when `quests` has no such quest or step, or
 * when nothing changes.
 */
export function setQuestStep(book: QuestBook, quests: readonly QuestDef[], quest: string, step: string | null): QuestBook | null {
  const def = quests.find((q) => q.id === quest);
  const entry = book[quest];
  if (!def) return null;
  if (step === null) {
    if (!entry) return null;
    const rest: Record<string, QuestEntry> = { ...book };
    delete rest[quest];
    return rest;
  }
  if (!def.steps.some((s) => s.id === step) || entry?.step === step) return null;
  const n = Math.max(0, ...Object.values(book).map((e) => e.n)) + 1;
  return { ...book, [quest]: { step, flags: entry?.flags ?? [], n } };
}

/**
 * Puts `count` mobs of `kind` beside a player at (x, y), on open tiles, as ?mob= does: a kind that
 * patrols (MobStats.patrol) as one group on its loop 8 tiles east, a kind that ambushes
 * (MobStats.ambush) as one group that lurks 3 tiles east, and the others 5 tiles east, one 2 tiles from
 * the other. Returns the mobs; none without an open tile there.
 */
export function spawnBeside(horde: Horde, world: SpawnFinder, kind: MobKind, count: number, x: number, y: number): Mob[] {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  try {
    if (MOB_STATS[kind].patrol) {
      const spot = world.findSpawn(tx + 8, ty, 0);
      return horde.spawnPatrol(kind, spot.x, spot.y, count);
    }
    if (MOB_STATS[kind].ambush) {
      const spot = world.findSpawn(tx + 3, ty, 0);
      return horde.spawnAmbush(kind, spot.x, spot.y, count);
    }
    return Array.from({ length: count }, (_, i) => {
      const spot = world.findSpawn(tx + 5, ty + 2 * i - (count - 1), 0);
      return horde.spawn(kind, spot.x, spot.y);
    });
  } catch {
    return [];
  }
}
