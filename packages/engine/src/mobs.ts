import { TICK_SECONDS, TILE_SIZE } from './constants.ts';
import { flyArrow, newArrow, type Arrow } from './arrows.ts';
import { attackRoll, averageDice, dice, edgeOf, rollDice, rollingDice, type Dice, type DiceSource, type Edge } from './dice.ts';
import { crXp } from './experience.ts';
import { BANDIT_PARRY_AC, CLASH_PAUSE_MS, CLASH_PUSH, CLASH_REEL_TICKS, CLASH_TICKS, EVADE_STAMINA, FEINT_MS, GUARD_BREAK_TICKS, MOB_BODY, NIMBLE_DISTANCE, NIMBLE_MS, NO_MECHANICS, PARRY_BIND_MS, PARRY_PUSH, PARRY_STAMINA, PARRY_TICKS, PARRY_WINDOW_TICKS, PROTECT_RANGE, RIPOSTE_MS, SHARP_PARRY_TICKS, SHIELD_AC, SHIELD_UP_MS, SHOVE_ARC, SHOVE_KNOCK_MS, SHOVE_PUSH, SHOVE_STAMINA, SHOVE_TICKS, SIDE_SHARE, SLAM_WINDUP, TURN_MS, UNCANNY_TICKS, atFlank, braceGrade, braceSector, canShove, inFront, inShape, lateBraceAc, partBraceAc, shapeOf, shieldCaster, type BraceGrade, type MechanicEvent, type MechanicEventKind, type Mechanics, type Shape } from './mechanics.ts';
import { MOB_LOOT, rollLoot, type Loot } from './items.ts';
import { GUARD_TICKS, PLAYER_HALF_WIDTH, attackHits, blockPlayer, canBeHit, facingOfAngle, hitPlayer, missPlayer, moveAxis, normalAngle, rollOf, type Facing, type PlayerState } from './player.ts';
import { INSPIRE_RANGE, proficiencyBonus, type PlayerTraits } from './traits.ts';
import { FULL_BOX, type SolidMap, type World } from './world.ts';

/**
 * Mobs: hostile creatures that live in the woods. Each one wanders round its home. When it sees
 * a player, it runs at the player on a curved path, not a straight line; close enough, it winds
 * up and strikes. A hit stuns the player for a moment, and then the mob runs away from the
 * player for a while before it comes back for another attack. A player's blow takes health
 * points from a mob (Blow: the damage comes from the player's scores, traits.ts); the blow that
 * takes the last one kills it, and it dies with an animation.
 *
 * Mobs that hunt the same player take turns: they attack one after the other. The others hound
 * the player from close by, out of the reach of their blows and of the player's attacks, and the
 * next one in the line times its approach, so that its attack comes right after the one before.
 * In a pack the attacks overlap: the bigger the pack, the sooner the next one starts.
 *
 * Mobs never go into a building, and a world can keep them out of more (a town): see MobRules.
 * They do not collide with players, NPCs or each other, only with the world.
 *
 * A world gives its rules with WorldSource.mobs(). In a shared world the server runs the mobs (a
 * Room has a Horde); in a single-player world the client runs the same Horde. The horde uses
 * only its own seeded random numbers, so it is the same code everywhere.
 */

/**
 * The kinds of mobs. The order is the code on the wire: add a kind at the end. The hobgoblin band
 * (story phase 3, chapter 1.5.1 of Kandrax): the goblin (an archer), the worg (a wolf that
 * charges), the hobgoblin (a soldier) and the bugbear (the brute of the band); and the leader of
 * its war band, the Hobgoblin Devastator, a caster (story phase 4b: its rite, Rite). The Ashen
 * Seekers (story phases 7 to 9, docs/drafts/story-arcane-raiders.md): the cinder hound (a dog of
 * ash that charges), the watcher (a Seeker that never fights: MobStats.watch), the blade (a
 * soldier), the cinder adept (it casts fire bolts as an archer shoots) and the Ash Warden (a
 * caster that goes in ash at half of its hit points: MobStats.vanishAt). The goblins of the forest
 * on the road to Ironhold (the tutorial, docs/drafts/tutorial.md; protocol 36): the skirmisher, a
 * goblin with a scimitar that patrols with its group, startles when it sees a player, and flees or
 * fights (MobStats.patrol). The bandits of the same forest by day (things that follow the hour,
 * docs/features/game/day-and-night.md; protocol 40): the bandit, a robber with a scimitar, that
 * ambushes a player with its group (MobStats.ambush).
 */
export type MobKind = 'imp' | 'brute' | 'goblin' | 'worg' | 'hobgoblin' | 'bugbear' | 'devastator' | 'hound' | 'watcher' | 'seeker' | 'adept' | 'warden' | 'skirmisher' | 'bandit';
export const MOB_KINDS: readonly MobKind[] = ['imp', 'brute', 'goblin', 'worg', 'hobgoblin', 'bugbear', 'devastator', 'hound', 'watcher', 'seeker', 'adept', 'warden', 'skirmisher', 'bandit'];

/**
 * The rite of the Hobgoblin Devastator (chapter 1.5.1: "Arma Elemental de Área", a spell of 4 turns
 * that it casts at the rear of the band). It stands still for `ms` in a circle of `radius` (world
 * pixels) with `runes` runes on it. Each blow that hits it breaks one rune; when the last one breaks,
 * the rite fails, and it reels. When the rite ends with runes left, the weapons of the mobs of the
 * kinds `allies` in the circle burn for `burnMs` (BURN_TO_HIT, BURN_DICE). It begins a rite while it
 * hunts and an ally whose weapon does not burn stands in the circle, `cooldownMs` after its last one.
 */
export interface Rite {
  readonly ms: number;
  readonly radius: number;
  readonly runes: number;
  readonly allies: readonly MobKind[];
  readonly burnMs: number;
  readonly cooldownMs: number;
}

/** A burning weapon (5e: Elemental Weapon): +1 to hit, and 1d4 more damage of fire. */
export const BURN_TO_HIT = 1;
export const BURN_DICE = dice(1, 4);

export interface MobStats {
  /** World pixels per second: walking round its home, running at a player, running away. */
  readonly wanderSpeed: number;
  readonly chaseSpeed: number;
  readonly retreatSpeed: number;
  /** It sees a player this close (world pixels), and gives up the chase beyond `forget`. */
  readonly sight: number;
  readonly forget: number;
  /** It starts an attack this close to the player; the blow lands if the player is still within `hitRange`. */
  readonly reach: number;
  readonly hitRange: number;
  /** The wind-up before the blow, and the blow itself (ms). */
  readonly windupMs: number;
  readonly strikeMs: number;
  /** It keeps running at the player during the wind-up at this speed (px/s; 0: it stands). */
  readonly windupSpeed: number;
  /** How far it lunges forward during the blow (world pixels). */
  readonly lunge: number;
  /** A hit stuns the player for this many ticks. */
  readonly stunTicks: number;
  /** After a hit it runs away for a time between these two (ms). */
  readonly retreatMs: readonly [number, number];
  /**
   * While another mob has the turn, it hounds the player at a distance between these two (world
   * pixels): out of its own reach, and out of the player's (ATTACK_REACH + radius).
   */
  readonly harass: readonly [number, number];
  /** The radius of its body, for the player's attacks (world pixels). */
  readonly radius: number;
  /** Its feet box, for the collisions with the world. */
  readonly halfWidth: number;
  readonly halfHeight: number;
  /** The death animation (ms); then it is gone. */
  readonly deathMs: number;
  /** Its hit points (5e: the SRD stat block, level-3.md): a blow that hits takes its damage of them. */
  readonly health: number;
  /** Its Armour Class: a player's attack roll must reach it (5e). */
  readonly ac: number;
  /** Its attack bonus: d20 + this against the player's AC (5e). */
  readonly toHit: number;
  /** The dice of its hit (5e). */
  readonly damage: Dice;
  /** Dice that its hit adds when another mob stands next to its target (a hobgoblin's martial advantage). */
  readonly allyDice?: Dice;
  /**
   * Its level: the challenge rating of its stat block (5e; 1/8, 1/4, 1/2, 1, 2...). It changes none of
   * its numbers, and no screen shows it (Fede, 2026-10-14): its XP (mobXp) sizes the encounters of the
   * story, and a kill gives a share of it (experience.ts, killXp).
   */
  readonly cr: number;
  /** A blow pushes it this far away from the attacker (world pixels), dead or not, times Blow.push. */
  readonly knockback: number;
  /** A blow that does not kill stuns it for this long (ms), times Blow.stagger: its wind-up or its blow stops. */
  readonly hurtMs: number;
  /** Its hit poisons for this many ticks (times the player's PlayerTraits.resist); 0: no poison. */
  readonly poisonTicks: number;
  /**
   * An archer: its blow is an arrow that flies this far (world pixels) at the player, and hits the
   * first player on its way (arrows.ts). Its reach is how close it comes to shoot. After a shot it
   * runs away for a while, as after a hit.
   */
  readonly arrowRange?: number;
  /** It charges in a straight line, not on a curve (the worg). */
  readonly straight?: boolean;
  /** A caster's rite (the Hobgoblin Devastator). */
  readonly rite?: Rite;
  /**
   * A watcher (the Seekers that watch from the trees): it never hunts and never strikes. A player this
   * close to it (world pixels), or a blow that reaches it, and it goes in ash (Horde.vanish). On a
   * march it stays WATCH_BACK points of the route behind the end.
   */
  readonly watch?: number;
  /** A blow that takes its hit points to this share of MobStats.health or under makes it go in ash, not reel (the Ash Warden). */
  readonly vanishAt?: number;
  /**
   * A patrol (the goblins of a forest, Horde.spawnPatrol): it walks a loop with its group, from
   * `group[0]` to `group[1]` mobs. The first one that sees a player startles the group (state
   * 'startled', STARTLE_MS); then a random number of them, from none to all, flee (state 'flee', at
   * `fleeSpeed`: slower than a player, so a player catches them) and the others fight. A caught or
   * cornered one turns and fights; one that gets away hides for HIDE_MS and then goes back to its loop.
   */
  readonly patrol?: { readonly group: readonly [number, number]; readonly fleeSpeed: number };
  /**
   * An ambush (the bandits of the forest by day, Horde.spawnAmbush): a group of `group[0]` to `group[1]`
   * mobs hides near a player (state 'lurk': a page shows it only to a player whose seek reaches it,
   * PlayerTraits.seek). It creeps after the nearest player at `creepSpeed`, to where the player will be.
   * Within `hold` of the player (world pixels) it holds still and waits; it springs at the player within
   * `spring`, after `holdMs` of a hold, or at a blow that reaches it.
   */
  readonly ambush?: {
    readonly group: readonly [number, number];
    readonly creepSpeed: number;
    readonly hold: number;
    readonly spring: number;
    readonly holdMs: number;
  };
}

/** A watcher on a march stands this many points of its route before the end (Road: 4 points for each tile). */
export const WATCH_BACK = 40;

/**
 * The small, quick imp and the big, slow brute, and the hobgoblin band. The player walks at 80
 * px/s. The numbers of a fight are 5e's (level-3.md): the imp is a quasit, the brute a half-ogre,
 * the band as in the SRD.
 */
export const MOB_STATS: Readonly<Record<MobKind, MobStats>> = {
  imp: {
    wanderSpeed: 30,
    chaseSpeed: 96,
    retreatSpeed: 80,
    sight: 112,
    forget: 200,
    reach: 15,
    hitRange: 21,
    windupMs: 280,
    strikeMs: 240,
    windupSpeed: 86,
    lunge: 7,
    stunTicks: 60,
    retreatMs: [1100, 1800],
    harass: [36, 50],
    radius: 7,
    halfWidth: 3,
    halfHeight: 2,
    deathMs: 750,
    health: 7,
    ac: 13,
    toHit: 4,
    damage: dice(1, 4, 3),
    // A quasit without its magic (no invisibility, no scare): as a CR 1/4.
    cr: 1 / 4,
    knockback: 10,
    hurtMs: 250,
    // An imp's claws carry a poison (Fede's choice, 2026-10-10).
    poisonTicks: 360,
  },
  brute: {
    wanderSpeed: 16,
    chaseSpeed: 42,
    retreatSpeed: 38,
    sight: 100,
    forget: 180,
    reach: 21,
    hitRange: 28,
    windupMs: 650,
    strikeMs: 380,
    windupSpeed: 0,
    lunge: 3,
    stunTicks: 120,
    retreatMs: [1400, 2200],
    harass: [42, 56],
    radius: 11,
    halfWidth: 5,
    halfHeight: 3,
    deathMs: 950,
    health: 30,
    ac: 12,
    toHit: 5,
    damage: dice(2, 8, 3),
    cr: 1,
    knockback: 18,
    hurtMs: 320,
    poisonTicks: 0,
  },
  // A small archer: it keeps away, shoots from the edge of the light, and runs off again.
  goblin: {
    wanderSpeed: 26,
    chaseSpeed: 70,
    retreatSpeed: 78,
    sight: 150,
    forget: 230,
    reach: 104,
    hitRange: 0,
    windupMs: 750,
    strikeMs: 260,
    windupSpeed: 0,
    lunge: 0,
    stunTicks: 30,
    retreatMs: [900, 1500],
    harass: [104, 124],
    radius: 6,
    halfWidth: 3,
    halfHeight: 2,
    deathMs: 750,
    health: 7,
    ac: 15,
    toHit: 4,
    damage: dice(1, 6, 2),
    cr: 1 / 4,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    arrowRange: 150,
  },
  // A big wolf: faster than a player, it runs straight in and leaps from far.
  worg: {
    wanderSpeed: 34,
    chaseSpeed: 112,
    retreatSpeed: 92,
    sight: 130,
    forget: 230,
    reach: 30,
    hitRange: 36,
    windupMs: 380,
    strikeMs: 320,
    windupSpeed: 0,
    lunge: 20,
    stunTicks: 70,
    retreatMs: [1000, 1600],
    harass: [46, 60],
    radius: 9,
    halfWidth: 5,
    halfHeight: 3,
    deathMs: 850,
    health: 26,
    ac: 13,
    toHit: 5,
    damage: dice(2, 6, 3),
    cr: 1 / 2,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    straight: true,
  },
  // A soldier: steady, quicker than a brute, hard to put down.
  hobgoblin: {
    wanderSpeed: 22,
    chaseSpeed: 62,
    retreatSpeed: 50,
    sight: 120,
    forget: 200,
    reach: 17,
    hitRange: 24,
    windupMs: 460,
    strikeMs: 300,
    windupSpeed: 30,
    lunge: 5,
    stunTicks: 90,
    retreatMs: [1100, 1700],
    harass: [40, 54],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 900,
    health: 11,
    ac: 18,
    toHit: 3,
    damage: dice(1, 8, 1),
    allyDice: dice(2, 6),
    cr: 1 / 2,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
  },
  // The brute of the band: big, hairy and slow, with a long reach and a heavy blow.
  bugbear: {
    wanderSpeed: 18,
    chaseSpeed: 48,
    retreatSpeed: 40,
    sight: 110,
    forget: 190,
    reach: 22,
    hitRange: 30,
    windupMs: 600,
    strikeMs: 380,
    windupSpeed: 0,
    lunge: 4,
    stunTicks: 130,
    retreatMs: [1400, 2200],
    harass: [44, 58],
    radius: 11,
    halfWidth: 5,
    halfHeight: 3,
    deathMs: 950,
    health: 27,
    ac: 16,
    toHit: 4,
    damage: dice(2, 8, 2),
    cr: 1,
    knockback: 20,
    hurtMs: 300,
    poisonTicks: 0,
  },
  // The leader of the war band, a caster with a staff. HP and AC of the Hobgoblin Devastator of
  // Volo's Guide (45, 13). Its CR is the game's own: Volo's block is CR 4 for its spells (fireball,
  // fly); here it has its staff and its rite only, about CR 1.
  devastator: {
    wanderSpeed: 22,
    chaseSpeed: 54,
    retreatSpeed: 46,
    sight: 130,
    forget: 220,
    reach: 18,
    hitRange: 25,
    windupMs: 520,
    strikeMs: 320,
    windupSpeed: 20,
    lunge: 6,
    stunTicks: 70,
    retreatMs: [1200, 1800],
    harass: [54, 70],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 1000,
    health: 45,
    ac: 13,
    toHit: 3,
    damage: dice(1, 6, 1),
    cr: 1,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    // 15 m in the chapter (10 tiles); 8 tiles in the game, so that the circle fits the screen.
    rite: { ms: 6000, radius: 128, runes: 3, allies: ['hobgoblin', 'bugbear'], burnMs: 30_000, cooldownMs: 15_000 },
  },
  // A dog of the Ashen Seekers, grey as ash, with embers in its cracks: a wolf of the SRD (AC 13,
  // 11 hit points, a bite +4, 2d4+2), a little tougher. It charges straight, as the worg does.
  hound: {
    wanderSpeed: 32,
    chaseSpeed: 108,
    retreatSpeed: 90,
    sight: 140,
    forget: 230,
    reach: 26,
    hitRange: 32,
    windupMs: 360,
    strikeMs: 300,
    windupSpeed: 0,
    lunge: 16,
    stunTicks: 60,
    retreatMs: [900, 1500],
    harass: [42, 56],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 850,
    health: 13,
    ac: 13,
    toHit: 4,
    damage: dice(2, 4, 2),
    cr: 1 / 4,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    straight: true,
  },
  // A Seeker that watches from the trees (a woman in a mask of bone, Mira Wren says). It does not fight.
  watcher: {
    wanderSpeed: 24,
    chaseSpeed: 0,
    retreatSpeed: 0,
    sight: 0,
    forget: 0,
    reach: 0,
    hitRange: 0,
    windupMs: 0,
    strikeMs: 0,
    windupSpeed: 0,
    lunge: 0,
    stunTicks: 0,
    retreatMs: [0, 0],
    harass: [0, 0],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 900,
    health: 9,
    ac: 12,
    toHit: 0,
    damage: dice(0, 0),
    cr: 0,
    knockback: 0,
    hurtMs: 0,
    poisonTicks: 0,
    watch: 4 * TILE_SIZE,
  },
  // A blade of the Ashen Seekers: a fighter in a robe of ash and a mask of bone, with a scimitar. Between
  // a thug and a bandit captain of the SRD (AC 13, 22 hit points, +4, 1d6+2).
  seeker: {
    wanderSpeed: 24,
    chaseSpeed: 66,
    retreatSpeed: 54,
    sight: 125,
    forget: 210,
    reach: 17,
    hitRange: 24,
    windupMs: 420,
    strikeMs: 280,
    windupSpeed: 34,
    lunge: 6,
    stunTicks: 80,
    retreatMs: [1000, 1600],
    harass: [40, 54],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 1000,
    health: 22,
    ac: 13,
    toHit: 4,
    damage: dice(1, 6, 2),
    cr: 1 / 2,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
  },
  // A cinder adept: a caster of the Seekers. It keeps away and casts a fire bolt (5e: +4, 1d10), as a
  // goblin shoots an arrow. An acolyte of the SRD (AC 12, 13 hit points) with the cantrip.
  adept: {
    wanderSpeed: 22,
    chaseSpeed: 62,
    retreatSpeed: 72,
    sight: 150,
    forget: 230,
    reach: 110,
    hitRange: 0,
    windupMs: 900,
    strikeMs: 280,
    windupSpeed: 0,
    lunge: 0,
    stunTicks: 40,
    retreatMs: [1000, 1700],
    harass: [110, 130],
    radius: 7,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 1000,
    health: 13,
    ac: 12,
    toHit: 4,
    damage: dice(1, 10),
    cr: 1 / 2,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    arrowRange: 160,
  },
  // The Ash Warden, a lieutenant of Verath: a tall Seeker with a crest of bone and a long blade. It
  // casts the rite of the Devastator for its blades, and at half of its hit points it goes in ash. As
  // a CR 2 of the SRD (AC 15, 60 hit points, +5, 1d8+3).
  warden: {
    wanderSpeed: 24,
    chaseSpeed: 60,
    retreatSpeed: 50,
    sight: 140,
    forget: 230,
    reach: 20,
    hitRange: 27,
    windupMs: 500,
    strikeMs: 320,
    windupSpeed: 26,
    lunge: 7,
    stunTicks: 100,
    retreatMs: [1100, 1700],
    harass: [50, 66],
    radius: 9,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 1100,
    health: 60,
    ac: 15,
    toHit: 5,
    damage: dice(1, 8, 3),
    cr: 2,
    knockback: 8,
    hurtMs: 200,
    poisonTicks: 0,
    rite: { ms: 6000, radius: 128, runes: 3, allies: ['seeker'], burnMs: 30_000, cooldownMs: 15_000 },
    vanishAt: 0.5,
  },
  // A goblin of the forest (the tutorial; the SRD goblin with its scimitar): it patrols with its group,
  // and when it sees a player it startles, then flees or fights. Its wind-up is slow and clear, and it
  // stands in it, so that a new player sees it and dodges. After a hit it slips away (Nimble Escape).
  skirmisher: {
    wanderSpeed: 28,
    chaseSpeed: 72,
    retreatSpeed: 74,
    sight: 120,
    forget: 230,
    reach: 15,
    hitRange: 22,
    windupMs: 700,
    strikeMs: 280,
    windupSpeed: 0,
    lunge: 5,
    stunTicks: 45,
    retreatMs: [800, 1300],
    harass: [40, 54],
    radius: 6,
    halfWidth: 3,
    halfHeight: 2,
    deathMs: 750,
    health: 7,
    ac: 15,
    toHit: 4,
    damage: dice(1, 6, 2),
    cr: 1 / 4,
    knockback: 12,
    hurtMs: 260,
    poisonTicks: 0,
    // 0.8 of the speed of a player (80 px/s): a player that runs after one catches it.
    patrol: { group: [2, 3], fleeSpeed: 64 },
  },
  // A bandit of the forest road (Fede, 2026-10-13: by day it takes the place of the goblins, rare, in a
  // group of 1 to 3, at the level of a goblin): a robber in a hood, with a scarf over its face and a
  // scimitar, the SRD bandit (AC 12, 11 hit points, +3, 1d6+1). It ambushes (MobStats.ambush): it
  // creeps after a player unseen, holds still in cover when it is close, and springs out.
  bandit: {
    wanderSpeed: 30,
    chaseSpeed: 74,
    retreatSpeed: 70,
    sight: 130,
    forget: 240,
    reach: 16,
    hitRange: 23,
    windupMs: 600,
    strikeMs: 280,
    windupSpeed: 0,
    lunge: 6,
    stunTicks: 45,
    retreatMs: [900, 1400],
    harass: [42, 56],
    radius: 8,
    halfWidth: 4,
    halfHeight: 3,
    deathMs: 800,
    health: 11,
    ac: 12,
    toHit: 3,
    damage: dice(1, 6, 1),
    cr: 1 / 8,
    knockback: 10,
    hurtMs: 240,
    poisonTicks: 0,
    // It creeps a little slower than a player walks (80 px/s), and as fast as a sneak walk.
    ambush: { group: [1, 3], creepSpeed: 44, hold: 5 * TILE_SIZE, spring: 40, holdMs: 2500 },
  },
};

/** The 5e XP of a mob kind, from its challenge rating (MobStats.cr): the encounters of the story size themselves with it. */
export function mobXp(kind: MobKind): number {
  return crXp(MOB_STATS[kind].cr);
}

/**
 * What a mob does: stands (idle) or walks round its home, runs at a player (chase), winds up,
 * strikes, runs away after a hit (retreat), dies, reels from a blow that did not kill it (hurt),
 * rides another mob (ride: a goblin on a worg, protocol 27), casts a rite (rite: the Devastator,
 * protocol 29), stops short when it sees a player (startled: a patrol, protocol 36), flees from
 * the player (flee: a patrol, protocol 36), or hides and creeps after a player (lurk: an ambush,
 * protocol 40). The order is the code on the wire.
 */
export type MobState = 'idle' | 'walk' | 'chase' | 'windup' | 'strike' | 'retreat' | 'dying' | 'hurt' | 'ride' | 'rite' | 'startled' | 'flee' | 'lurk';
export const MOB_STATES: readonly MobState[] = ['idle', 'walk', 'chase', 'windup', 'strike', 'retreat', 'dying', 'hurt', 'ride', 'rite', 'startled', 'flee', 'lurk'];

export interface Mob {
  readonly id: number;
  readonly kind: MobKind;
  /** The centre of its feet, in world pixels. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: Facing;
  state: MobState;
  /** Milliseconds since the state began: the animations need it. */
  stateMs: number;
  /** The health points that it has left (MobStats.health at first, or Mob.maxHealth). */
  health: number;
  /** Its most health points, when they are not MobStats.health (SpawnOptions.health: a foe of the sandbox). */
  maxHealth?: number;
  /** The mob that it rides, while it rides (state 'ride'): its id. */
  mount?: number;
  /** Where it sits: 0 on the back of its mount, 1 behind (a goblin behind the hobgoblin). */
  seat?: number;
  /** In a rite (state 'rite'): the runes that it has left. */
  runes?: number;
  /** While its weapon burns (a Devastator's rite): the ms left. */
  burning?: number;
  /** A mob of a raid (Horde.unleash): it may go into a town (MobRules.raid). */
  raider?: boolean;
  /** A mob of the story (an ambush, the attackers of a convoy): only such a mob hunts a quarry (HordePlayer.quarry). */
  story?: boolean;
  /**
   * The ms left of an opening that a mechanic of the sandbox gave (mechanics.ts: the riposte): the next
   * blow of a player on it rolls with advantage and adds the INT opening (Blow.opening).
   */
  exposed?: number;
  /** The guards of the mobs of the sandbox (mechanics.ts): the ms left of a raised shield (a hobgoblin), a parry ready for the next blow (a bandit), and a feint (a bugbear that holds its blow). */
  guardUp?: number;
  parryReady?: boolean;
  feint?: boolean;
  /** A blow that a parry met (the parry of the sandbox, mechanics.ts): the weapons stay locked, and it holds its blow (PARRY_BIND_MS). */
  bind?: boolean;
}

/** A rider sits this far behind the middle of its mount for each seat (world pixels). */
export const SEAT_GAP = 5;

/**
 * A player's blow (traits.ts): its attack bonus and the dice of its damage (5e), and its force as
 * shares of the mob's MobStats.knockback (the push) and MobStats.hurtMs (the reel).
 */
export interface Blow {
  /** d20 + this against the mob's AC. */
  readonly toHit: number;
  readonly damage: Dice;
  readonly push: number;
  readonly stagger: number;
  /** The damage that it adds on a mob in its wind-up (Intelligence: the player uses the opening). */
  readonly opening?: number;
  /** The dice that it adds on a mob that does not hunt the attacker (a rogue's sneak attack). */
  readonly sneak?: Dice;
  /** How far it hits (world pixels, plus the radius of the mob); without it, ATTACK_REACH. A reach weapon hits further. */
  readonly reach?: number;
}

/** The blow of a level-3 player whose scores are all 10, with a d8 weapon (GUEST_TRAITS). */
export const PLAIN_BLOW: Blow = { toHit: 2, damage: dice(1, 8), push: 1, stagger: 1, opening: 0 };

/** What a blow did to a mob: the damage that it took (0: a miss), and whether it was a critical hit. */
export interface BlowResult {
  readonly mob: Mob;
  readonly damage: number;
  readonly crit: boolean;
}

/**
 * Rolls a blow on this mob now (5e): d20 + Blow.toHit against its AC; a hit rolls the damage, more on
 * a mob in its wind-up or with an opening (Blow.opening, Mob.exposed) and on a mob that does not hunt
 * the attacker (`unaware`: the dice of Blow.sneak). A critical hit rolls all the dice twice. Damage 0: a
 * miss. A mob with an opening (Mob.exposed) gives the roll advantage.
 */
export function rollBlow(blow: Blow, mob: Pick<Mob, 'kind' | 'state' | 'exposed' | 'guardUp'>, unaware: boolean, source: DiceSource, acBonus = 0): { damage: number; crit: boolean } {
  const exposed = (mob.exposed ?? 0) > 0;
  const roll = attackRoll(blow.toHit, MOB_STATS[mob.kind].ac + acBonus, source, edgeOf(exposed, (mob.guardUp ?? 0) > 0));
  if (!roll.hit) return { damage: 0, crit: false };
  let damage = rollDice(blow.damage, source, roll.crit) + (mob.state === 'windup' || exposed ? (blow.opening ?? 0) : 0);
  if (unaware && blow.sneak && blow.sneak.count > 0) damage += rollDice(blow.sneak, source, roll.crit);
  return { damage: Math.max(1, damage), crit: roll.crit };
}

/** The average damage of a blow that hits (the debug panel and the builder's numbers). */
export function averageBlow(blow: Pick<Blow, 'damage'>): number {
  return Math.max(1, averageDice(blow.damage));
}

/**
 * How the mobs of an area live (MobSpawn.behaviour). `wander`: alone, round its home, and it prowls
 * towards the players. `patrol`: a group on a loop that startles when it sees a player, then flees or
 * fights (MobStats.patrol). `ambush`: a group that hides, creeps after a player unseen and springs at it
 * (MobStats.ambush, state 'lurk').
 */
export type MobBehaviour = 'wander' | 'patrol' | 'ambush';

/** A kind of mob in an area at an hour (MobArea): how many, in what groups, how often, and how it behaves. */
export interface MobSpawn {
  readonly kind: MobKind;
  /** How many of them live round each player. */
  readonly count: number;
  /** How they behave. Default: the kind's (MobStats.patrol: patrol; MobStats.ambush: ambush; else wander). */
  readonly behaviour?: MobBehaviour;
  /** The mobs of a group (patrol, ambush): from group[0] to group[1]. Default: the kind's (MobStats.patrol or ambush). */
  readonly group?: readonly [number, number];
  /**
   * A rare mob: the mean time between two of its groups round one player (ms; each wait is from half of
   * it to one and a half times it, and the first one starts when the player comes into the area at that
   * hour). Without it, a group comes as soon as the area wants more.
   */
  readonly every?: number;
}

/**
 * The mobs of an area by day and at night (Horde.daytime; Fede, 2026-10-13). An area can have the same
 * mobs by day and at night, with another number or behaviour, or the same lists.
 */
export interface MobArea {
  readonly day: readonly MobSpawn[];
  readonly night: readonly MobSpawn[];
}

/** The behaviour of a kind without another one in its spawn: a patrol or an ambush if its stats have one. */
export function kindBehaviour(kind: MobKind): MobBehaviour {
  const stats = MOB_STATS[kind];
  return stats.patrol ? 'patrol' : stats.ambush ? 'ambush' : 'wander';
}

/** The behaviour of a spawn (MobSpawn.behaviour, else the kind's). */
export function spawnBehaviour(spawn: MobSpawn): MobBehaviour {
  return spawn.behaviour ?? kindBehaviour(spawn.kind);
}

/** The same mobs by day and at night: one spawn for each kind of a population, with the kind's behaviour. */
export function populationArea(population: Readonly<Partial<Record<MobKind, number>>>): MobArea {
  const spawns = MOB_KINDS.filter((kind) => (population[kind] ?? 0) > 0).map((kind): MobSpawn => ({ kind, count: population[kind]! }));
  return { day: spawns, night: spawns };
}

/** Where the mobs of a world may be, and how many there are. */
export interface MobRules {
  /**
   * Whether a mob may live and wander on a tile: it spawns there and walks round there. `kind`: the
   * kind of the mob (a world keeps the goblins of a forest there, and the other kinds out of it).
   */
  roam(tx: number, ty: number, kind?: MobKind): boolean;
  /** Whether a mob may step on a tile while it chases a player or runs away (roam, or a little more). */
  hunt(tx: number, ty: number): boolean;
  /**
   * Whether a mob of a raid (Horde.unleash: the war band in Silverspring) may step on a tile: the
   * towns too. Without it, as `hunt`.
   */
  raid?(tx: number, ty: number): boolean;
  /**
   * How many mobs of each kind live round each player (a kind without a number: none), by day and at
   * night, with the kind's behaviour. `areaAt` takes its place where a world gives it.
   */
  readonly population: Readonly<Partial<Record<MobKind, number>>>;
  /**
   * The mobs of the area where a player stands, by day and at night (MobArea), in place of `population`:
   * the goblins of the forest on the road to Ironhold at night, its bandits by day.
   */
  areaAt?(tx: number, ty: number): MobArea;
}

/** A player as the horde sees it: an id, and its state (a hit changes the state: a stun). */
export interface HordePlayer {
  readonly id: number;
  readonly state: PlayerState;
  /** A companion (companions.ts): mobs hunt it, but no new mob comes for it, and no mob prowls to it. */
  readonly companion?: boolean;
  /** How far mobs see it, as a share of their sight (Dexterity, sneaking: PlayerTraits.sight). Default 1. */
  readonly sight?: number;
  /**
   * A quarry of the story (a guard of a caravan): only the mobs of the story (Mob.story) look for it.
   * Another mob fights it only when it strikes that mob.
   */
  readonly quarry?: boolean;
  /**
   * How it takes a hit: its Armour Class (a mob's attack roll must reach it; 10 without), the share of a
   * stun and of a poison (CON), and its guard after a stun (DEX); how a pack presses it (CHA:
   * presence, daunt); and the guard that it gives to the players near it when they are hit (CHA:
   * inspire).
   */
  readonly traits?: Partial<Pick<PlayerTraits, 'ac' | 'braceAc' | 'shield' | 'class' | 'level' | 'deflect' | 'stun' | 'resist' | 'guard' | 'presence' | 'daunt' | 'inspire'>>;
}

/**
 * The extra guard that a player who was hit gets from the others: the best `inspire` of a player
 * within INSPIRE_RANGE of it (not itself, and not one that is defeated).
 */
function inspireFor(id: number, hit: PlayerState, players: readonly HordePlayer[]): number {
  let best = 0;
  for (const p of players) {
    if (p.id === id || p.state.down > 0) continue;
    const inspire = p.traits?.inspire ?? 0;
    if (inspire > best && Math.hypot(p.state.x - hit.x, p.state.y - hit.y) <= INSPIRE_RANGE) best = inspire;
  }
  return best;
}

/** A mob that an arrow killed, and the player who shot it: the Room gives the drop to that player. */
export interface ShotKill {
  readonly mob: Mob;
  readonly owner: number;
}

/** What a player's arrow did when it reached a mob (BlowResult), and the player who shot it. */
export interface ShotResult extends BlowResult {
  readonly owner: number;
}

/** A mob's attack on a player: [mob id, player id, damage]; damage 0 is a miss (it glanced off, or a brace evaded it). */
export type MobHit = [number, number, number];

/**
 * How a player stands against a mob's blow now (Horde.defence): the AC that the roll must reach, the
 * edge of the roll (dice.ts), whether its brace counts against the blow (a miss is then an evade), and
 * the grade of the brace (mechanics.ts; null without the grades).
 */
interface Defence {
  readonly ac: number;
  readonly edge: Edge;
  readonly braced: boolean;
  readonly grade: BraceGrade | null;
  /** A parry that meets this blow (the parry, mechanics.ts): a miss is a parry; `sharp` in its last ticks. */
  readonly parry: { readonly sharp: boolean } | null;
  /** A shield in a guard stance that meets this blow (mechanics.ts): a miss is a block. */
  readonly block?: boolean;
}

/** A parry that waits for the blow of a mob (Horde.parry): the mob, a sharp one, the bonus to the AC, and until when it holds (horde ms). */
interface Parry {
  readonly mob: number;
  readonly sharp: boolean;
  readonly bonus: number;
  readonly untilMs: number;
}

/**
 * A mob that a blow killed (an arrow too), and the attackers whose blows hit it before (their ids:
 * players, and guards): each character among them gets the XP of the kill (experience.ts, killXp).
 */
export interface Defeat {
  readonly mob: Mob;
  readonly hitters: readonly number[];
}

/** A mob walks at most this far from its home while it wanders (world pixels). */
const WANDER_RADIUS = 4 * TILE_SIZE;
/**
 * A mob prowls: when it sets off on a walk, with this chance it moves its home this far towards
 * the nearest player (world pixels), but not closer to it than PROWL_NEAREST. So mobs come near
 * the players over time, and find them.
 */
const PROWL_CHANCE = 0.5;
const PROWL_STEP = 3 * TILE_SIZE;
const PROWL_NEAREST = 6 * TILE_SIZE;
/** The most tiles that a prowl searches for its way. */
const PROWL_SEARCH = 3000;
/**
 * A mob does not chase further than this from its home (world pixels): then it goes back. A mob
 * in the pack round its player (close to it) takes its home with it: the fight goes where the
 * player goes.
 */
const LEASH = 18 * TILE_SIZE;
/** A mob that gave up a hunt does not look for players for this long (ms): it walks back first. */
const REST_MS = 3000;
/** It follows a player that it cannot see any more for this long (ms), to where it saw it last. */
const MEMORY_MS = 1500;
/** Mobs of a player are counted this close to it (tiles); new ones come this far from every player (tiles). */
const POPULATION_RADIUS = 28;
const SPAWN_DISTANCE = [17, 25] as const;
/** A wandering mob this far from every player goes away (tiles). */
const DESPAWN_DISTANCE = 36;
/** At most one new mob each SPAWN_GAP_MS; after a kill, none for KILL_PAUSE_MS. */
const SPAWN_GAP_MS = 2000;
const KILL_PAUSE_MS = 6000;
/** The most mobs in a horde at once. */
const MAX_MOBS = 40;
/** The curve of a chase: the angle (radians) off the straight line, far from the player. */
const CURVE = [0.35, 0.65] as const;
/** A blow pushes a mob back (MobStats.knockback) over this long (ms), fast at first. */
const KNOCKBACK_MS = 200;
/** A hobgoblin's martial advantage: another mob this close to its target (world pixels, 1.5 tiles). */
const ALLY_RANGE = 24;
/** The longest move in one go, so a mob never passes through a solid box. */
const MAX_MOVE = 6;
/** A mob that stays this close to one point while it wants to move is stuck (world pixels); after this long (ms) it changes its plan, and a chase gives up after GIVE_UP_MS. */
const STUCK_RADIUS = 8;
const STUCK_MS = 1500;
const GIVE_UP_MS = 4000;
/** The ways round an obstacle, as angles off the wished direction, nearest first. */
const DETOURS = [0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5];
/**
 * A mob in the line of a player hounds it within this distance beyond MobStats.harass (world
 * pixels); further away it runs at the player as in a chase. The next in the line stays the next
 * while it is within twice that distance.
 */
const HOUND_MARGIN = 16;
/**
 * While it hounds, it moves round the player (its goal is this many radians ahead on its circle),
 * at this share of its chase speed when it is at its distance, and faster by HOUND_PULL px/s for
 * each pixel that it is off its distance.
 */
const ORBIT = 0.4;
const HOUND_SPEED = 0.5;
const HOUND_PULL = 12;
/** Mobs that hound one player keep this far apart round it (radians). */
const SPREAD = 1.1;
/** The next in the line closes in at this share of its chase speed: it can keep up with its timed distance. */
const CLOSE_IN = 0.8;
/**
 * The attacks of a pack overlap: the next mob may start its wind-up when the attack before it has
 * this share of its length left, for each mob of the pack after the first, up to OVERLAP_MAX
 * (one mob: 0, two: 0.2, three: 0.4, four: 0.6). The pack: the mobs that hunt the player within
 * PACK_RADIUS of it (world pixels).
 */
const OVERLAP_STEP = 0.2;
const OVERLAP_MAX = 0.75;
const PACK_RADIUS = 8 * TILE_SIZE;
const TICK_MS = TICK_SECONDS * 1000;
/** A patrol that sees a player stops short for this long (ms; a "!" over the heads), then flees or fights. */
export const STARTLE_MS = 600;
/** The members of a patrol within this distance of the one that saw the player startle with it (world pixels). */
const GROUP_RANGE = 8 * TILE_SIZE;
/** A fleeing mob this close to its player (world pixels, beyond its reach) is caught: it turns and fights. */
const CATCH_MARGIN = 8;
/** A fleeing mob that got away hides for this long (ms), and then goes back to its loop. */
export const HIDE_MS = 10_000;
/** The loop of a patrol: this many points round the place where its group comes, this far from it (tiles). */
const PATROL_POINTS = 6;
const PATROL_RADIUS = [3, 6] as const;
/** The members of a patrol walk this far apart (world pixels). */
const PATROL_GAP = 7;
/** An ambush comes this far ahead of its player (tiles), and never closer to a player than AMBUSH_NEAREST (tiles). */
const AMBUSH_DISTANCE = [11, 15] as const;
const AMBUSH_NEAREST = 8;
/** A lurker creeps after a player within this distance (world pixels), to where the player will be in AMBUSH_LEAD ms. */
const LURK_RANGE = 24 * TILE_SIZE;
const AMBUSH_LEAD = 1500;
/** The members of an ambush keep this far apart (world pixels). */
const AMBUSH_GAP = 14;
/** A mob that the area does not want at this hour goes away when no player is this close (tiles): out of view. */
const LEAVE_DISTANCE = 17;
/** A group of the story comes this far ahead of its player (tiles: Horde.spawnAhead), out of its view. */
const AHEAD_DISTANCE = [17, 21] as const;

interface Brain {
  home: { readonly x: number; readonly y: number };
  /** The player that it chases or runs from, where it saw it last, and for how long it has not seen it. */
  target: number | null;
  seenX: number;
  seenY: number;
  lostMs: number;
  /** The curve of this chase (signed radians). */
  curve: number;
  /** Where it walks to while it wanders. */
  goal: { x: number; y: number } | null;
  /** The time left in a wait, a wind-up, a blow or a retreat (ms). */
  timerMs: number;
  /** Whether the last blow hit. */
  hit: boolean;
  /** A way round an obstacle that it keeps for a moment, and for how long. */
  detour: number;
  detourMs: number;
  /**
   * How long it has wanted to move and stayed within STUCK_RADIUS of `anchor` (ms): it goes back
   * and forth in a pocket between obstacles, or it is blocked.
   */
  stuckMs: number;
  anchorX: number;
  anchorY: number;
  /** The direction of the last blow, how far it pushes (world pixels), and how long it reels (ms). */
  slideX: number;
  slideY: number;
  push: number;
  reelMs: number;
  /** When it joined the line of the mobs that hunt its target (horde ms): the line is in this order. */
  queuedMs: number;
  /** While it hounds: the distance that it keeps from the player, and for how long more (ms). */
  ring: number;
  ringMs: number;
  /** The way round the player (+1 or -1), and for how long more (ms). */
  orbit: number;
  orbitMs: number;
  /** After it gave up a hunt: how long more it does not look for players (ms). */
  restMs: number;
  /** A route that it marches while it does not hunt (world pixels; Horde.march), the next point on it, and its pace (px/s). */
  route: readonly { readonly x: number; readonly y: number }[] | null;
  routeIndex: number;
  routeSpeed: number;
  /** The time until it may begin another rite (ms). */
  riteMs: number;
  /** A patrol: its route is a loop (it starts again at its end), its group (0: none), and its place in the group (world pixels from the route). */
  loop: boolean;
  group: number;
  slotX: number;
  slotY: number;
  /** A patrol that saw a player: it flees (true) or fights, after its startle. */
  flee: boolean;
  /** A patrol that got away: it hides this long more (ms), and stands still. */
  hideMs: number;
  /** How it lives (MobBehaviour): an ambush lurks again after a hunt. */
  behaviour: MobBehaviour;
  /** A mob that the horde brought for an area (populate): it goes away when the area does not want it at this hour. */
  native: boolean;
  /** A lurker close to its player: how long it has held still (ms). */
  holdMs: number;
  /** The attackers (players, guards) whose blows hit it: a kill gives each character among them its XP. */
  readonly hitters: Set<number>;
  /** A foe that never flees, never lurks and never startles (SpawnOptions.steady: the sandbox). */
  steady: boolean;
  /** After its blow: it reels this long in place (ms), off balance, in place of its blow (the riposte, mechanics.ts); 0: no. */
  offBalanceMs: number;
  /** The way of its blow (radians), from the start of its wind-up (the flank, mechanics.ts). */
  aim: number;
  /** The ms left in which it turns to a player at its flank: it does not wind up (the flank, mechanics.ts). */
  turnMs: number;
  /** The shape of the blow that it winds up, and where the player stood when it began (the shapes of the blows, mechanics.ts). */
  shape: Shape | null;
  spotX: number;
  spotY: number;
  /** How long a bugbear has held its blow for a brace (ms), and the side of a goblin's step aside after its blow (+1, -1; 0: none) (the guards of the mobs). */
  feintMs: number;
  nimble: number;
  /** A parry met its blow (the parry, mechanics.ts): at the end of the bind, it and the player step apart. */
  parried: boolean;
}

/** How Horde.spawn() puts a mob: its hit points, and whether it is steady. */
export interface SpawnOptions {
  /** Its hit points (Mob.maxHealth); without it, MobStats.health. */
  readonly health?: number;
  /**
   * A steady foe (the sandbox of an admin): it hunts the players that it sees at once, and it never
   * startles, flees, hides or lurks, whatever its kind does (MobStats.patrol, MobStats.ambush).
   */
  readonly steady?: boolean;
}

/** mulberry32: small and the same in every JavaScript engine. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The facing for a move or a look in the direction (dx, dy). */
function facingTo(dx: number, dy: number, current: Facing): Facing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return current;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

const tileOf = (v: number) => Math.floor(v / TILE_SIZE);

/** The way a player goes (radians): where it walks, else where it faces. */
function headingOf(player: PlayerState): number {
  if (Math.hypot(player.vx, player.vy) > 1) return Math.atan2(player.vy, player.vx);
  return player.facing === 'left' ? Math.PI : player.facing === 'right' ? 0 : player.facing === 'up' ? -Math.PI / 2 : Math.PI / 2;
}

/** An ambush of a kind without MobStats.ambush (MobSpawn.behaviour 'ambush'). */
const DEFAULT_AMBUSH: NonNullable<MobStats['ambush']> = { group: [1, 3], creepSpeed: 40, hold: 5 * TILE_SIZE, spring: 40, holdMs: 2500 };

/** A marching mob is at a point of its route this close (world pixels). */
const ROUTE_REACH = 8;

/** The index of the point of a route nearest to (x, y). */
function nearestPoint(route: readonly { readonly x: number; readonly y: number }[], at: { readonly x: number; readonly y: number }): number {
  let best = 0;
  let bestD = Infinity;
  route.forEach((p, i) => {
    const d = Math.hypot(p.x - at.x, p.y - at.y);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** The mobs of a world: they come, wander, hunt players, and die. */
export class Horde {
  readonly world: World;
  readonly rules: MobRules;
  /** The mobs, the dying ones too. step() and strike() change them. */
  readonly mobs: Mob[] = [];
  /** The arrows in flight (arrows.ts): step() flies them. */
  readonly arrows: Arrow[] = [];
  private nextArrow = 1;
  /** Mobs that arrows killed since the last takeShotKills(), and what the arrows did since the last takeShotResults(). */
  private shotKills: ShotKill[] = [];
  private shotResults: ShotResult[] = [];
  /** Mobs that blows and arrows killed since the last takeDefeats(), with the attackers that hit them. */
  private defeats: Defeat[] = [];
  /** Where the dice of the fights come from (dice.ts): the horde's own random numbers, or the averages (tests). */
  readonly dice: DiceSource;
  /** The guard after a stun of each player (ticks), from the last step. */
  private guards = new Map<number, number>();
  /**
   * Other bodies that a player's arrow may hit besides the mobs (the guards of a caravan that its owner
   * robs: guards.ts), and what a hit on one does. The Room sets them; none by default.
   */
  arrowBodies: ((owner: number) => readonly { readonly id: number; readonly x: number; readonly y: number; readonly radius: number }[]) | null = null;
  onArrowBody: ((owner: number, id: number, blow: Blow) => void) | null = null;
  /** The traits of each player that change how mobs fight it, from the last step. */
  private bodies = new Map<number, NonNullable<HordePlayer['traits']>>();
  private readonly brains = new Map<number, Brain>();
  private readonly random: () => number;
  /** The world for a mob: a tile that a mob may not step on is solid. The same for a mob of a raid (raidGround). */
  private readonly ground: SolidMap;
  private readonly raidGround: SolidMap;
  private nextId = 1;
  private nextGroup = 1;
  private spawnMs = SPAWN_GAP_MS;
  /** The time of the horde (ms): the sum of its steps. */
  private clockMs = 0;
  /** For each player that mobs hunt: the mob with the next turn to attack it. See nextUp(). */
  private readonly nextMob = new Map<number, number>();
  /** Whether it is day (the Room and the page set it from the hour: daytime.ts, isDaytime): the areas give their mobs of that hour (MobArea). */
  daytime = false;
  /** The mechanics of the melee draft that are on (mechanics.ts): none, but in the sandbox of an admin. */
  mechanics: Mechanics = NO_MECHANICS;
  /** What the mechanics did since the last takeEvents(): the page shows them. */
  private events: MechanicEvent[] = [];
  /** The parries that wait for a mob's blow, by player (the parry, mechanics.ts). */
  private readonly parries = new Map<number, Parry>();
  /** The mobs of a world without MobRules.areaAt: its population, by day and at night. */
  private readonly plainArea: MobArea;
  /** For each player, when the next group of each rare spawn (MobSpawn.every) may come (horde ms). */
  private readonly rareAt = new Map<number, Map<MobKind, number>>();

  /** `dice`: where the dice come from; without it, random numbers of their own from `seed` (the AI's stay the same). */
  constructor(world: World, rules: MobRules, seed: number, dice?: DiceSource) {
    this.world = world;
    this.rules = rules;
    this.random = rng(seed);
    this.dice = dice ?? rollingDice(rng(seed ^ 0x5bd1e995));
    this.ground = { solidBox: (tx, ty) => (this.passable(tx, ty) ? world.solidBox(tx, ty) : FULL_BOX) };
    this.raidGround = { solidBox: (tx, ty) => (this.passable(tx, ty, true) ? world.solidBox(tx, ty) : FULL_BOX) };
    this.plainArea = populationArea(rules.population);
  }

  /** The mobs that are alive (not dying). */
  get living(): number {
    let n = 0;
    for (const mob of this.mobs) if (mob.state !== 'dying') n++;
    return n;
  }

  /**
   * Puts a new mob of `kind` on the back of `mount` (in seat `seat`): it rides it (state 'ride') and
   * goes where it goes. When the mount starts to hunt, reels or dies, the rider jumps off and goes
   * for the mount's target (the chapter: the goblins get off and shoot, the worgs charge).
   */
  spawnRider(kind: MobKind, mount: Mob, seat: number): Mob {
    const rider = this.spawn(kind, mount.x, mount.y);
    rider.mount = mount.id;
    rider.seat = seat;
    rider.state = 'ride';
    this.seat(rider, mount);
    return rider;
  }

  /** Puts a rider on its seat on its mount: behind the middle, as the mount faces. */
  private seat(rider: Mob, mount: Mob): void {
    const [fx, fy] = mount.facing === 'left' ? [-1, 0] : mount.facing === 'right' ? [1, 0] : mount.facing === 'up' ? [0, -1] : [0, 1];
    const back = SEAT_GAP * (rider.seat ?? 0);
    rider.x = mount.x - fx * back;
    rider.y = mount.y - fy * back + 0.5;
    rider.vx = mount.vx;
    rider.vy = mount.vy;
    rider.facing = mount.facing;
  }

  /** A rider rides on, or jumps off when its mount hunts, reels, dies or is gone. */
  private ride(rider: Mob, brain: Brain): void {
    const mount = rider.mount === undefined ? undefined : this.mobs.find((m) => m.id === rider.mount);
    if (mount && (mount.state === 'idle' || mount.state === 'walk' || mount.state === 'ride')) {
      this.seat(rider, mount);
      return;
    }
    // Off it goes, beside the mount, and at its target.
    const side = (rider.seat ?? 0) === 0 ? 1 : -1;
    delete rider.mount;
    delete rider.seat;
    if (mount) {
      rider.x = mount.x + (mount.facing === 'up' || mount.facing === 'down' ? side * 8 : 0);
      rider.y = mount.y + (mount.facing === 'left' || mount.facing === 'right' ? side * 6 : 0);
    }
    brain.home = { x: rider.x, y: rider.y };
    const target = mount ? this.brains.get(mount.id)?.target : null;
    if (target !== null && target !== undefined) {
      brain.target = target;
      brain.lostMs = 0;
      brain.curve = this.newCurve();
      this.enter(rider, 'chase');
    } else this.enter(rider, 'idle');
  }

  /** Puts a new mob at (x, y), which is also its home (`options`: its hit points, and whether it is steady). */
  spawn(kind: MobKind, x: number, y: number, options: SpawnOptions = {}): Mob {
    const mob: Mob = { id: this.nextId++, kind, x, y, vx: 0, vy: 0, facing: 'down', state: 'idle', stateMs: 0, health: options.health ?? MOB_STATS[kind].health };
    if (options.health !== undefined) mob.maxHealth = options.health;
    this.mobs.push(mob);
    this.brains.set(mob.id, {
      home: { x, y },
      target: null,
      seenX: 0,
      seenY: 0,
      lostMs: 0,
      curve: 0,
      goal: null,
      timerMs: this.between(500, 3000),
      hit: false,
      detour: 0,
      detourMs: 0,
      stuckMs: 0,
      anchorX: x,
      anchorY: y,
      slideX: 0,
      slideY: 0,
      push: 0,
      reelMs: 0,
      queuedMs: 0,
      ring: MOB_STATS[kind].harass[1],
      ringMs: 0,
      orbit: 1,
      orbitMs: 0,
      restMs: 0,
      route: null,
      routeIndex: 0,
      routeSpeed: 0,
      riteMs: 0,
      loop: false,
      hitters: new Set(),
      group: 0,
      slotX: 0,
      slotY: 0,
      flee: false,
      hideMs: 0,
      behaviour: options.steady ? 'wander' : kindBehaviour(kind),
      native: false,
      holdMs: 0,
      steady: options.steady === true,
      offBalanceMs: 0,
      aim: 0,
      turnMs: 0,
      shape: null,
      spotX: 0,
      spotY: 0,
      feintMs: 0,
      nimble: 0,
      parried: false,
    });
    return mob;
  }

  /**
   * A mob hunts player `id` (at `at`) now, as if it had seen it: it joins the line of the mobs that
   * hunt the player (the foes of the sandbox start their fight so).
   */
  provoke(mob: Mob, id: number, at: PlayerState): void {
    const brain = this.brains.get(mob.id);
    if (!brain || mob.state === 'dying') return;
    brain.target = id;
    brain.seenX = at.x;
    brain.seenY = at.y;
    brain.lostMs = 0;
    brain.restMs = 0;
    brain.curve = this.newCurve();
    brain.queuedMs = this.clockMs;
    this.enter(mob, 'chase');
    mob.facing = facingTo(at.x - mob.x, at.y - mob.y, mob.facing);
  }

  /**
   * Puts a patrol of `size` mobs of `kind` at (x, y): a group that walks a loop round that place
   * (MobStats.patrol), each member a step from the others. Without room for a loop (too little open
   * ground), they wander round the place as other mobs do.
   */
  spawnPatrol(kind: MobKind, x: number, y: number, size: number): Mob[] {
    const loop = this.patrolLoop(kind, x, y);
    const group = this.nextGroup++;
    const members: Mob[] = [];
    for (let i = 0; i < size; i++) {
      const mob = this.spawn(kind, x, y);
      const brain = this.brains.get(mob.id)!;
      brain.group = group;
      brain.behaviour = 'patrol';
      // The first one walks on the loop; the others a step to its sides and behind it.
      const angle = i * 2.3;
      brain.slotX = i === 0 ? 0 : Math.cos(angle) * PATROL_GAP;
      brain.slotY = i === 0 ? 0 : Math.sin(angle) * PATROL_GAP * 0.7;
      if (loop) {
        brain.route = loop;
        brain.loop = true;
        brain.routeIndex = nearestPoint(loop, mob);
        brain.routeSpeed = MOB_STATS[kind].wanderSpeed;
      }
      members.push(mob);
    }
    return members;
  }

  /** The loop of a patrol round (x, y): PATROL_POINTS open tiles round it, in order; null with fewer than 3. */
  private patrolLoop(kind: MobKind, x: number, y: number): { x: number; y: number }[] | null {
    const turn = this.random() * 2 * Math.PI;
    const radius = this.between(PATROL_RADIUS[0], PATROL_RADIUS[1]) * TILE_SIZE;
    const points: { x: number; y: number }[] = [];
    for (let k = 0; k < PATROL_POINTS; k++) {
      const angle = turn + (k / PATROL_POINTS) * 2 * Math.PI;
      const r = radius * this.between(0.7, 1.15);
      const tx = tileOf(x + Math.cos(angle) * r);
      const ty = tileOf(y + Math.sin(angle) * r);
      if (this.open(tx, ty, kind)) points.push({ x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 });
    }
    return points.length >= 3 ? points : null;
  }

  /**
   * Puts an ambush of `size` mobs of `kind` round (x, y): a group that hides (state 'lurk') and creeps
   * after the nearest player (MobStats.ambush), each member a few steps from the others.
   */
  spawnAmbush(kind: MobKind, x: number, y: number, size: number): Mob[] {
    const group = this.nextGroup++;
    const members: Mob[] = [];
    for (let i = 0; i < size; i++) {
      const angle = i * 2.3;
      const ox = i === 0 ? 0 : Math.cos(angle) * AMBUSH_GAP;
      const oy = i === 0 ? 0 : Math.sin(angle) * AMBUSH_GAP * 0.7;
      // Its own place beside the first one, if that place is open; else the same place.
      const open = this.open(tileOf(x + ox), tileOf(y + oy), kind);
      const mob = this.spawn(kind, open ? x + ox : x, open ? y + oy : y);
      const brain = this.brains.get(mob.id)!;
      brain.group = group;
      brain.behaviour = 'ambush';
      brain.slotX = ox;
      brain.slotY = oy;
      this.enter(mob, 'lurk');
      members.push(mob);
    }
    return members;
  }

  /**
   * Puts a group of `kind` ahead of a player (where it walks or faces), out of its view (AHEAD_DISTANCE
   * tiles, and that far from the other `players`), on open ground where the kind may live: from
   * `group[0]` to `group[1]` mobs, with the kind's behaviour (a patrol on its loop, an ambush that lurks;
   * a confrontation of the story, confrontations.ts). Returns the mobs; none without room.
   */
  spawnAhead(kind: MobKind, group: readonly [number, number], player: PlayerState, players: readonly PlayerState[] = []): Mob[] {
    for (let tries = 0; tries < 24; tries++) {
      const angle = headingOf(player) + this.between(-0.35, 0.35);
      const r = this.between(AHEAD_DISTANCE[0], AHEAD_DISTANCE[1]) * TILE_SIZE;
      const tx = tileOf(player.x + Math.cos(angle) * r);
      const ty = tileOf(player.y + Math.sin(angle) * r);
      if (!this.open(tx, ty, kind)) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + 12;
      if ([player, ...players].some((p) => Math.hypot(p.x - x, p.y - y) < SPAWN_DISTANCE[0] * TILE_SIZE)) continue;
      const size = group[0] + Math.floor(this.random() * (group[1] - group[0] + 1));
      const behaviour = kindBehaviour(kind);
      if (behaviour === 'patrol') return this.spawnPatrol(kind, x, y, size);
      if (behaviour === 'ambush') return this.spawnAmbush(kind, x, y, size);
      return Array.from({ length: size }, () => this.spawn(kind, x, y));
    }
    return [];
  }

  /**
   * Sends a mob along a route (world pixels) at `speed` px/s (the war band on the north road): it
   * walks the route while it does not hunt, and after a hunt it goes on from the point of the route
   * nearest to it. At the end it stands. A mob with a route never goes away (despawn): it marches on
   * with nobody near.
   */
  march(mob: Mob, route: readonly { readonly x: number; readonly y: number }[], speed: number): void {
    const brain = this.brains.get(mob.id);
    if (!brain || route.length === 0) return;
    brain.route = route;
    brain.routeIndex = nearestPoint(route, mob);
    brain.routeSpeed = speed;
  }

  /** Whether a mob is at the end of its route. */
  arrived(id: number): boolean {
    const brain = this.brains.get(id);
    return brain !== undefined && brain.route !== null && brain.routeIndex >= brain.route.length;
  }

  /** Takes mobs out of the world at once (no death): the war band that came into Silverspring. */
  dismiss(ids: readonly number[]): void {
    for (const id of ids) {
      const mob = this.mobs.find((m) => m.id === id);
      if (mob) this.remove(mob);
    }
  }

  /**
   * Moves the horde on by `dtMs` (at most 250 ms count). Mobs attack the players that they reach:
   * each attack rolls against the player's AC (5e), and a hit stuns it and takes its damage.
   * Returns the attacks, as [mob id, player id, damage] (damage 0: a miss).
   */
  step(dtMs: number, players: readonly HordePlayer[]): MobHit[] {
    const dt = Math.min(Math.max(0, dtMs), 250);
    const hits: MobHit[] = [];
    this.clockMs += dt;
    // The players without the companions: new mobs come round them, and mobs prowl to them.
    const people = players.filter((p) => !p.companion);
    this.populate(dt, people);
    const byId = new Map(players.map((p) => [p.id, p.state]));
    const bodies = new Map(players.map((p) => [p.id, p.traits ?? {}]));
    this.bodies = bodies;
    this.guards = new Map(players.map((p) => [p.id, p.traits?.guard ?? GUARD_TICKS]));
    for (const id of this.nextMob.keys()) if (!byId.has(id)) this.nextMob.delete(id);
    this.flyArrows(dt, players, hits);
    for (const mob of [...this.mobs]) {
      const brain = this.brains.get(mob.id)!;
      mob.stateMs += dt;
      if (brain.riteMs > 0) brain.riteMs -= dt;
      if (mob.burning !== undefined && (mob.burning -= dt) <= 0) delete mob.burning;
      if (mob.exposed !== undefined && (mob.exposed -= dt) <= 0) delete mob.exposed;
      if (mob.guardUp !== undefined && (mob.guardUp -= dt) <= 0) delete mob.guardUp;
      if (brain.turnMs > 0) brain.turnMs -= dt;
      switch (mob.state) {
        case 'idle':
        case 'walk':
          if ((!brain.route || brain.loop) && this.despawn(mob, players)) break;
          if (this.leaves(mob, brain, people)) break;
          if (MOB_STATS[mob.kind].watch !== undefined && this.watched(mob, players)) break;
          if (brain.behaviour === 'ambush' && brain.restMs <= 0) {
            // An ambush after a hunt, or that wandered: it hides again.
            this.enter(mob, 'lurk');
            break;
          }
          if (brain.hideMs > 0) {
            // A patrol that got away hides: it stands still, and looks for nobody.
            brain.hideMs -= dt;
            if (mob.state !== 'idle') this.enter(mob, 'idle');
            break;
          }
          if (brain.restMs > 0) brain.restMs -= dt;
          else if (this.notice(mob, brain, players)) break;
          if (brain.route) this.marchOn(mob, brain, dt);
          else this.wander(mob, brain, dt, people);
          break;
        case 'chase':
          this.chase(mob, brain, byId, dt);
          break;
        case 'windup': {
          const stats = MOB_STATS[mob.kind];
          const target = brain.target === null ? undefined : byId.get(brain.target);
          if (target) {
            // A quick mob keeps running at the player while it winds up, so running away does not save the player.
            const dx = target.x - mob.x;
            const dy = target.y - mob.y;
            if (stats.windupSpeed > 0 && Math.hypot(dx, dy) > stats.reach * 0.6) this.steer(mob, brain, Math.atan2(dy, dx), stats.windupSpeed, dt);
            else {
              mob.vx = 0;
              mob.vy = 0;
            }
            mob.facing = facingTo(dx, dy, mob.facing);
          }
          brain.timerMs -= dt;
          if (brain.timerMs > 0) break;
          // A bugbear waits out a brace (the guards of the mobs): it holds its blow a moment, and the glint of INT 15 does not come.
          if (target && mob.kind === 'bugbear' && this.mechanics.has('mobGuards') && target.brace > 0 && brain.feintMs < FEINT_MS) {
            brain.feintMs += dt;
            mob.feint = true;
            break;
          }
          brain.feintMs = 0;
          delete mob.feint;
          if (stats.arrowRange !== undefined) {
            // An archer looses its arrow at the player; the arrow decides the hit. Then it runs off.
            if (target) this.shootAt(mob, Math.atan2(target.y - mob.y, target.x - mob.x), stats.arrowRange);
            brain.hit = target !== undefined;
            this.enter(mob, 'strike');
            brain.timerMs = stats.strikeMs;
            break;
          }
          // The blow: it reaches the player if the player is still close, and not stunned or just
          // after a stun. Then its attack roll: a hit stuns and hurts; a miss glances off.
          // With a shape (the shapes of the blows), the blow lands only in its shape.
          const inReach = target !== undefined && (brain.shape ? inShape(brain.shape, mob.x, mob.y, brain.aim, stats.hitRange, target.x, target.y, brain.spotX, brain.spotY) : Math.hypot(target.x - mob.x, target.y - mob.y) <= stats.hitRange);
          const reached = inReach && canBeHit(target!);
          brain.hit = reached && this.attack(mob, brain.target!, target!, players, hits);
          if (this.mechanics.has('mobGuards')) {
            // After its blow, a hobgoblin raises its shield, and a bandit is ready to parry.
            if (mob.kind === 'hobgoblin') {
              mob.guardUp = SHIELD_UP_MS;
              this.event('raise', mob, brain.target!);
            }
            if (mob.kind === 'bandit') mob.parryReady = true;
          }
          // The flank: a blow that did not hit a player at its side; it must turn first.
          if (!brain.hit && target && this.mechanics.has('flank') && atFlank(mob.x, mob.y, brain.aim, target.x, target.y)) {
            brain.turnMs = stats.strikeMs + TURN_MS;
            mob.exposed = Math.max(mob.exposed ?? 0, stats.strikeMs + TURN_MS);
            this.event('flank', mob, brain.target!);
          }
          if (brain.offBalanceMs > 0 && !brain.parried) {
            // Off balance (a riposte): it reels in place, and its blow is over.
            this.stagger(mob, brain, brain.offBalanceMs);
            break;
          }
          // A parried blow: the weapons stay locked a moment (the bind), and then both step apart (blow()).
          const parried = brain.parried;
          this.enter(mob, 'strike');
          brain.parried = parried;
          if (parried) mob.bind = true;
          brain.timerMs = stats.strikeMs + (parried ? PARRY_BIND_MS : 0);
          break;
        }
        case 'strike':
          this.blow(mob, brain, byId, dt);
          break;
        case 'retreat':
          this.retreat(mob, brain, byId, dt);
          break;
        case 'dying':
          this.die(mob, brain, dt);
          break;
        case 'hurt':
          this.reel(mob, brain, byId, dt);
          break;
        case 'ride':
          this.ride(mob, brain);
          break;
        case 'rite':
          this.chant(mob, brain, byId, dt);
          break;
        case 'startled':
          this.startled(mob, brain, byId, dt);
          break;
        case 'flee':
          this.flee(mob, brain, byId, dt);
          break;
        case 'lurk':
          if (this.despawn(mob, players) || this.leaves(mob, brain, people)) break;
          this.lurk(mob, brain, players, dt);
          break;
      }
    }
    return hits;
  }

  /**
   * An attack from `attacker` (the player `attackerId`) in the direction `aim` (radians) touches
   * every living mob in its reach. `at` can give another position of a mob (where the attacker saw
   * it, a moment ago): a touch there counts too. For each mob that it touches, the blow rolls
   * (rollBlow): a hit takes its damage and pushes the mob away; the one that takes the last of its
   * hit points kills it; another one makes it reel (`hurt`). A miss glances off: no damage, no reel.
   * Either way the mob goes for the attacker. Returns what the blow did to each mob that it touched:
   * the dead ones are `dying`. `player`: the state of the attacker, for the clash of the sandbox
   * (mechanics.ts): a mob whose blow it meets is not in the results.
   */
  strike(
    attacker: { readonly x: number; readonly y: number },
    aim: number,
    at?: (mob: Mob) => { x: number; y: number } | null,
    attackerId?: number,
    blow: Blow = PLAIN_BLOW,
    player?: PlayerState,
  ): BlowResult[] {
    const struck: BlowResult[] = [];
    for (const mob of this.mobs) {
      if (mob.state === 'dying') continue;
      const radius = MOB_STATS[mob.kind].radius;
      const then = at?.(mob) ?? null;
      const hit =
        attackHits(attacker.x, attacker.y, aim, mob.x, mob.y, radius, blow.reach) ||
        (then !== null && attackHits(attacker.x, attacker.y, aim, then.x, then.y, radius, blow.reach));
      if (!hit) continue;
      if (player && attackerId !== undefined && this.clash(mob, player, attackerId, blow)) continue;
      struck.push(this.hit(mob, mob.x - attacker.x, mob.y - attacker.y, blow, attackerId));
    }
    return struck;
  }

  /**
   * The clash (mechanics.ts): a blow of player `id` that starts in the last CLASH_TICKS of the wind-up of
   * a mob that hunts it meets the mob's blow. Each side rolls its attack; the loser reels, and nobody takes
   * damage; a tie pushes both back. Returns whether the blows met.
   */
  private clash(mob: Mob, player: PlayerState, id: number, blow: Blow): boolean {
    const brain = this.brains.get(mob.id)!;
    if (!this.mechanics.has('clash') || mob.state !== 'windup' || brain.target !== id || brain.timerMs > CLASH_TICKS * TICK_MS) return false;
    const stats = MOB_STATS[mob.kind];
    const ours = rollDice(dice(1, 20, blow.toHit), this.dice);
    const theirs = rollDice(dice(1, 20, stats.toHit + (mob.burning !== undefined ? BURN_TO_HIT : 0)), this.dice);
    if (ours > theirs) {
      // The mob reels, as from a blow, and its blow is broken.
      this.stagger(mob, brain, stats.hurtMs);
      this.event('clashWon', mob, id);
    } else if (ours < theirs) {
      player.reel = Math.max(player.reel, CLASH_REEL_TICKS);
      player.attack = 0;
      this.stagger(mob, brain, CLASH_PAUSE_MS);
      this.event('clashLost', mob, id);
    } else {
      this.apart(mob, player, CLASH_PUSH);
      this.stagger(mob, brain, CLASH_PAUSE_MS);
      this.event('clash', mob, id);
    }
    brain.target = id;
    return true;
  }

  /**
   * A ranger's attack: an arrow from `from` in the direction `aim`, that flies `range` world
   * pixels (arrows.ts). The next step() flies it; a kill is in takeShotKills().
   */
  shoot(from: { readonly x: number; readonly y: number }, aim: number, range: number, ownerId: number, blow: Blow = PLAIN_BLOW): Arrow {
    const arrow = newArrow(this.nextArrow++, ownerId, from.x, from.y, aim, range, blow);
    this.arrows.push(arrow);
    return arrow;
  }

  /** The mobs that arrows killed since the last call, with their shooters. */
  takeShotKills(): ShotKill[] {
    const kills = this.shotKills;
    this.shotKills = [];
    return kills;
  }

  /** The mobs that blows and arrows killed since the last call, with the attackers whose blows hit them (the XP of a kill). */
  takeDefeats(): Defeat[] {
    const defeats = this.defeats;
    this.defeats = [];
    return defeats;
  }

  /** What the mechanics of the melee draft did since the last call (mechanics.ts): a word for the page to show. */
  takeEvents(): MechanicEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private event(kind: MechanicEventKind, mob: Mob, player: number): void {
    this.events.push({ kind, mob: mob.id, player });
  }

  /** What the players' arrows did to mobs since the last call (a hit, a miss), with their shooters. */
  takeShotResults(): ShotResult[] {
    const results = this.shotResults;
    this.shotResults = [];
    return results;
  }

  /**
   * A blow on a mob from the direction (dx, dy): its roll (rollBlow). A hit takes its damage and
   * pushes the mob away; the blow that takes the last of its hit points kills it; another one makes
   * it reel (`hurt`). A miss glances off. Either way the mob turns on the attacker. Returns what the
   * blow did.
   */
  private hit(mob: Mob, dx: number, dy: number, blow: Blow, attackerId?: number, melee = true): BlowResult {
    const brain = this.brains.get(mob.id)!;
    // A rider that a blow reaches is off its mount, hit or not.
    if (mob.state === 'ride') {
      delete mob.mount;
      delete mob.seat;
      brain.home = { x: mob.x, y: mob.y };
      this.enter(mob, 'idle');
    }
    // A watcher does not stay for a blow: it goes in ash.
    if (MOB_STATS[mob.kind].watch !== undefined) {
      const damage = mob.health;
      mob.health = 0;
      this.vanish(mob.id);
      return { mob, damage, crit: false };
    }
    const unaware = attackerId !== undefined && !this.hunts(mob, attackerId);
    // A blow on a lurker: its ambush springs at the attacker (the blow still takes it unaware).
    if (mob.state === 'lurk' && attackerId !== undefined) this.spring(mob, attackerId, null);
    // A bandit's parry (the guards of the mobs): the first blow after its own, not an arrow.
    const parried = melee && mob.parryReady === true;
    delete mob.parryReady;
    const { damage, crit } = rollBlow(blow, mob, unaware, this.dice, parried ? BANDIT_PARRY_AC : 0);
    // An opening (a riposte) is for one blow.
    delete mob.exposed;
    if (parried && damage === 0 && attackerId !== undefined) this.event('mobParry', mob, attackerId);
    if (damage === 0) {
      // A miss: the mob does not reel, but it knows who attacked it.
      if (attackerId !== undefined && mob.state !== 'hurt') {
        brain.target = attackerId;
        brain.lostMs = 0;
        if (mob.state === 'idle' || mob.state === 'walk') this.enter(mob, 'chase');
      }
      return { mob, damage: 0, crit: false };
    }
    const d = Math.hypot(dx, dy) || 1;
    brain.slideX = dx / d;
    brain.slideY = dy / d;
    const stats = MOB_STATS[mob.kind];
    brain.push = stats.knockback * blow.push;
    brain.reelMs = stats.hurtMs * blow.stagger;
    mob.health = Math.max(0, mob.health - damage);
    if (attackerId !== undefined) brain.hitters.add(attackerId);
    if (mob.health <= 0) {
      this.enter(mob, 'dying');
      this.spawnMs = Math.max(this.spawnMs, KILL_PAUSE_MS);
      this.defeats.push({ mob, hitters: [...brain.hitters] });
      return { mob, damage, crit };
    }
    // The Ash Warden: hurt to half, it goes in ash (its health stays: it is not dead).
    if (stats.vanishAt !== undefined && mob.health <= stats.health * stats.vanishAt) {
      this.vanish(mob.id);
      return { mob, damage, crit };
    }
    // In a rite, a hit breaks one rune: the rite goes on while runes are left, else it fails.
    if (mob.state === 'rite' && mob.runes !== undefined && --mob.runes > 0) {
      if (attackerId !== undefined) brain.target = attackerId;
      return { mob, damage, crit };
    }
    // A rite whose last rune broke fails: the next one waits.
    if (mob.state === 'rite') brain.riteMs = MOB_STATS[mob.kind].rite?.cooldownMs ?? 0;
    // It reels, its wind-up or blow broken, and turns on the one who hit it (a patrol that fled too).
    brain.flee = false;
    if (attackerId !== undefined) brain.target = attackerId;
    brain.lostMs = 0;
    mob.facing = facingTo(-dx, -dy, mob.facing);
    this.enter(mob, 'hurt');
    return { mob, damage, crit };
  }

  /**
   * A mob's attack that reached player `id`: its roll against the player's AC (5e). A hit takes its
   * damage (with the martial advantage of a hobgoblin that has an ally next to the player), stuns and
   * poisons; a miss glances off. A player with Charisma close by gives a player that was hurt more
   * guard after the stun (the best one counts). Records it in `hits`; returns whether it hit. In a
   * brace the roll is against more AC (defence()), and a miss is an evade (missPlayer).
   */
  private attack(mob: Mob, id: number, target: PlayerState, players: readonly HordePlayer[], hits: MobHit[], melee = true): boolean {
    const stats = MOB_STATS[mob.kind];
    const body = this.bodies.get(id);
    const burning = mob.burning !== undefined;
    const defence = this.defence(mob, id, target, body, melee);
    // A fighter's Protection (the reactions): a fighter with a shield in a brace close by gives the blow disadvantage.
    const guardian = this.mechanics.has('reactions') ? players.find((p) => p.id !== id && p.traits?.class === 'fighter' && p.traits.shield === true && p.state.brace > 0 && Math.hypot(p.state.x - target.x, p.state.y - target.y) <= PROTECT_RANGE) : undefined;
    if (guardian) this.event('protect', mob, id);
    const edge = guardian ? edgeOf(defence.edge > 0, true) : defence.edge;
    const roll = attackRoll(stats.toHit + (burning ? BURN_TO_HIT : 0), defence.ac, this.dice, edge);
    if (!roll.hit) {
      missPlayer(target, defence.braced);
      if (defence.grade === 'sharp') this.event('sharp', mob, id);
      // A price in stamina: an evade costs some, a sharp one nothing.
      else if (defence.braced && this.mechanics.has('stamina')) {
        target.stamina = Math.max(0, target.stamina - EVADE_STAMINA);
        target.rest = 0;
      }
      if (defence.block) {
        // A shield in a guard turns the blow, for stamina.
        blockPlayer(target);
        this.event('block', mob, id);
      }
      if (defence.parry) {
        // A parry: the steel rings, and the weapons stay locked a moment (the bind); then both step back (blow()).
        this.event('parry', mob, id);
        this.brains.get(mob.id)!.parried = true;
        target.parry = Math.max(target.parry, Math.ceil(PARRY_BIND_MS / TICK_MS) + 2);
      }
      // The riposte: an evade (with the grades, a sharp or a clean one, not a late one), or a sharp parry, puts the mob off balance.
      const riposte = (defence.braced && defence.grade !== 'late') || defence.parry?.sharp === true;
      if (melee && riposte && this.mechanics.has('riposte')) {
        // After a parry the opening also covers its bind.
        mob.exposed = RIPOSTE_MS + (defence.parry ? stats.strikeMs + PARRY_BIND_MS : 0);
        this.brains.get(mob.id)!.offBalanceMs = RIPOSTE_MS;
        this.event('riposte', mob, id);
      }
      hits.push([mob.id, id, 0]);
      return false;
    }
    let damage = rollDice(stats.damage, this.dice, roll.crit);
    if (stats.allyDice && this.mobs.some((m) => m !== mob && m.state !== 'dying' && Math.hypot(m.x - target.x, m.y - target.y) <= ALLY_RANGE)) {
      damage += rollDice(stats.allyDice, this.dice, roll.crit);
    }
    if (burning) damage += rollDice(BURN_DICE, this.dice, roll.crit);
    damage = Math.max(1, damage);
    if (this.mechanics.has('reactions')) {
      // A monk deflects an arrow in its brace, and catches it when nothing is left.
      if (!melee && body?.class === 'monk' && target.brace > 0) {
        damage -= rollDice(dice(1, 10, body.deflect ?? 0), this.dice);
        if (damage <= 0) {
          this.event('caught', mob, id);
          hits.push([mob.id, id, 0]);
          return false;
        }
        this.event('deflect', mob, id);
      }
      // A rogue's Uncanny Dodge: a hit in its own attack, out of a brace, once in a while.
      if (body?.class === 'rogue' && target.attack > 0 && target.brace === 0 && target.uncanny === 0) {
        damage = Math.max(1, Math.floor(damage / 2));
        target.uncanny = UNCANNY_TICKS;
        this.event('uncanny', mob, id);
      }
      // A barbarian's rage halves the damage.
      if (target.rage > 0) damage = Math.max(1, Math.floor(damage / 2));
    }
    hitPlayer(target, damage, stats.stunTicks, stats.poisonTicks, body);
    if (target.down === 0) target.inspired = inspireFor(id, target, players);
    hits.push([mob.id, id, damage]);
    return true;
  }

  /**
   * How a player stands against a mob's blow now: its AC, and in a brace the AC of the brace
   * (PlayerTraits.braceAc). With the grades of a brace (mechanics.ts), a sharp brace also gives the mob
   * disadvantage, and a late one only a part of the AC of the brace. With the front of a brace, a brace
   * does not count against a blow from its side or its back.
   */
  private defence(mob: Mob, id: number, target: PlayerState, body: HordePlayer['traits'], melee = true): Defence {
    const ac = body?.ac ?? 10;
    const braceAc = body?.braceAc ?? 0;
    // A slam (the shapes of the blows) breaks a guard, and a brace or a parry does not count against it.
    const slam = melee && this.brains.get(mob.id)?.shape === 'slam';
    // A parry that waits for this blow (the parry): the proficiency bonus on the AC, and disadvantage when sharp.
    const parry = melee ? this.parries.get(id) : undefined;
    if (parry && parry.mob === mob.id) {
      this.parries.delete(id);
      if (this.clockMs <= parry.untilMs && target.parry > 0 && !slam) return { ac: ac + parry.bonus, edge: parry.sharp ? -1 : 0, braced: false, grade: null, parry: { sharp: parry.sharp } };
    }
    // The guard stance: a blow from its front rolls with disadvantage (a block with a shield); a heavy blow breaks it.
    if (target.guarding && this.mechanics.has('guard') && melee && inFront(target.x, target.y, target.aim, mob.x, mob.y)) {
      if (this.breaksGuard(mob) || slam) {
        target.guarding = false;
        target.reel = Math.max(target.reel, GUARD_BREAK_TICKS);
        this.event('broken', mob, id);
        return { ac, edge: 0, braced: false, grade: null, parry: null };
      }
      return { ac, edge: -1, braced: false, grade: null, parry: null, block: body?.shield === true };
    }
    // The spell Shield of a wizard or a sorcerer (the reactions): in its brace and a moment after it, from every side.
    if (this.mechanics.has('reactions') && shieldCaster(body?.class) && (target.brace > 0 || target.ward > 0) && !slam) {
      this.event('shield', mob, id);
      return { ac: ac + SHIELD_AC, edge: 0, braced: target.brace > 0, grade: null, parry: null };
    }
    if (target.brace === 0 || slam) return { ac, edge: 0, braced: false, grade: null, parry: null };
    // The front of a brace: in full from the front, half from a side, nothing from the back.
    const sector = this.mechanics.has('front') ? braceSector(target.x, target.y, target.aim, mob.x, mob.y) : 'front';
    if (sector === 'back') {
      this.event('behind', mob, id);
      return { ac, edge: 0, braced: false, grade: null, parry: null };
    }
    if (sector === 'side') this.event('side', mob, id);
    const grade = this.mechanics.has('grades') && braceAc > 0 ? braceGrade(target.braceAge) : null;
    const full = grade === 'late' ? lateBraceAc(braceAc) : braceAc;
    return { ac: ac + (sector === 'side' ? partBraceAc(full, SIDE_SHARE) : full), edge: grade === 'sharp' ? -1 : 0, braced: true, grade, parry: null };
  }

  /**
   * The parry (mechanics.ts): an attack of player `id` (at `player`, towards `aim`) that starts while
   * the blow of a mob comes (in the last PARRY_WINDOW_TICKS of the wind-up of a mob that hunts it, in
   * the reach of the attack) is a parry, not a blow: the player stands in its guard, and the blow of that
   * mob rolls against its AC and its proficiency bonus (sharp in the last SHARP_PARRY_TICKS: with
   * disadvantage too). Only with a melee weapon. Returns whether it is a parry: then the caller does not
   * strike.
   */
  parry(player: PlayerState, aim: number, id: number, traits: Pick<PlayerTraits, 'strike' | 'level' | 'reach'>): boolean {
    if (!this.mechanics.has('parry') || traits.strike.kind !== 'weapon' || traits.strike.ranged) return false;
    let best: Mob | null = null;
    let left = Infinity;
    for (const mob of this.mobs) {
      if (mob.state !== 'windup' || MOB_STATS[mob.kind].arrowRange !== undefined) continue;
      const brain = this.brains.get(mob.id)!;
      if (brain.target !== id || brain.timerMs > PARRY_WINDOW_TICKS * TICK_MS || brain.timerMs >= left) continue;
      if (!attackHits(player.x, player.y, aim, mob.x, mob.y, MOB_STATS[mob.kind].radius, traits.reach)) continue;
      best = mob;
      left = brain.timerMs;
    }
    if (!best) return false;
    // A price in stamina: a parry costs some, and there is none with no stamina.
    if (this.mechanics.has('stamina')) {
      if (player.stamina <= 0) return false;
      player.stamina = Math.max(0, player.stamina - PARRY_STAMINA);
      player.rest = 0;
    }
    this.parries.set(id, { mob: best.id, sharp: left <= SHARP_PARRY_TICKS * TICK_MS, bonus: proficiencyBonus(traits.level), untilMs: this.clockMs + left + 2 * TICK_MS });
    player.parry = PARRY_TICKS;
    return true;
  }

  /**
   * The shove (mechanics.ts): a roll of player `id` (at `player`) the way `aim` (radians) into a living
   * mob in its reach, within SHOVE_ARC of that way, is a shove: it costs the stamina of the roll and
   * the wait between dodges, and the player stands SHOVE_TICKS. A mob more than one size larger does
   * not move ("too big"). Else a contest: d20 + the player's athletics against d20 + the better of the
   * mob's STR and DEX; a win knocks the mob down (it reels for SHOVE_KNOCK_MS, SHOVE_PUSH away, and blows
   * on it roll with advantage), a loss or a tie does nothing. Returns whether it is a shove: then the
   * caller does not roll.
   */
  shove(player: PlayerState, id: number, aim: number, traits: Pick<PlayerTraits, 'reach' | 'size' | 'athletics' | 'dodgeCooldown' | 'rollReach' | 'rollSafe'>): boolean {
    if (!this.mechanics.has('shove')) return false;
    let best: Mob | null = null;
    let bestD = Infinity;
    for (const mob of this.mobs) {
      if (mob.state === 'dying' || mob.state === 'lurk' || mob.state === 'ride') continue;
      const dx = mob.x - player.x;
      const dy = mob.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > traits.reach + MOB_STATS[mob.kind].radius || d >= bestD) continue;
      if (Math.abs(normalAngle(Math.atan2(dy, dx) - aim)) > SHOVE_ARC) continue;
      best = mob;
      bestD = d;
    }
    if (!best) return false;
    // The price of the roll, and the player stands with its hands on the mob.
    // A price in stamina: a shove costs its own, else the stamina of the roll.
    player.stamina = Math.max(0, player.stamina - (this.mechanics.has('stamina') ? SHOVE_STAMINA : rollOf(player.load, traits).stamina));
    player.rest = 0;
    player.dodgeCooldown = traits.dodgeCooldown;
    player.shove = SHOVE_TICKS;
    player.braceWindow = 0;
    player.aim = Math.atan2(best.y - player.y, best.x - player.x);
    player.facing = facingOfAngle(player.aim);
    player.vx = 0;
    player.vy = 0;
    const body = MOB_BODY[best.kind];
    if (!canShove(traits.size, body.size)) {
      this.event('tooBig', best, id);
      return true;
    }
    const ours = rollDice(dice(1, 20, traits.athletics), this.dice);
    const theirs = rollDice(dice(1, 20, Math.max(body.str, body.dex)), this.dice);
    if (ours <= theirs) {
      this.event('held', best, id);
      return true;
    }
    const brain = this.brains.get(best.id)!;
    brain.target = id;
    brain.lostMs = 0;
    brain.slideX = Math.cos(player.aim);
    brain.slideY = Math.sin(player.aim);
    brain.push = SHOVE_PUSH;
    brain.reelMs = SHOVE_KNOCK_MS;
    best.exposed = SHOVE_KNOCK_MS;
    this.enter(best, 'hurt');
    this.event('shoved', best, id);
    return true;
  }

  /** Whether the blow of a mob is heavy enough to break a guard (the guard stance, mechanics.ts): a bugbear's. */
  private breaksGuard(mob: Mob): boolean {
    return mob.kind === 'bugbear';
  }

  /** A mob and a player step `push` world pixels apart (a parry, a clash). */
  private apart(mob: Mob, player: PlayerState, push: number): void {
    const dx = player.x - mob.x;
    const dy = player.y - mob.y;
    const d = Math.hypot(dx, dy) || 1;
    moveAxis(player, this.world, (dx / d) * push, 0);
    moveAxis(player, this.world, 0, (dy / d) * push);
    this.move(mob, (-dx / d) * push, (-dy / d) * push);
  }

  /** A mob's arrow (an archer's blow): it flies at the players (Arrow.from), with the mob's id as its owner, negative. */
  private shootAt(mob: Mob, aim: number, range: number): void {
    this.arrows.push({ ...newArrow(this.nextArrow++, -mob.id, mob.x, mob.y, aim, range, PLAIN_BLOW), from: mob.kind });
  }

  /**
   * Flies the arrows. A player's arrow hits the first living mob on its way; a mob's arrow hits the
   * first player on its way that can be hit now (canBeHit: not defeated, stunned, on guard or in a
   * dodge), as the mob's blow would (its hit as a hit of `hits`). A thing stops either.
   */
  private flyArrows(dtMs: number, players: readonly HordePlayer[], hits: MobHit[]): void {
    if (this.arrows.length === 0) return;
    const living = this.mobs.filter((m) => m.state !== 'dying');
    const targets = living.map((m) => ({ x: m.x, y: m.y, radius: MOB_STATS[m.kind].radius }));
    const open = players.filter((p) => canBeHit(p.state));
    const people = open.map((p) => ({ x: p.state.x, y: p.state.y, radius: PLAYER_HALF_WIDTH }));
    for (const arrow of [...this.arrows]) {
      if (arrow.from) {
        const hit = flyArrow(arrow, this.world, dtMs / 1000, people);
        if (hit === null) continue;
        this.arrows.splice(this.arrows.indexOf(arrow), 1);
        if (hit < 0) continue;
        const p = open[hit]!;
        const shooter = this.mobs.find((m) => m.id === -arrow.owner) ?? { id: -arrow.owner, kind: arrow.from };
        this.attack(shooter as Mob, p.id, p.state, players, hits, false);
        continue;
      }
      const bodies = this.arrowBodies?.(arrow.owner) ?? [];
      const hit = flyArrow(arrow, this.world, dtMs / 1000, bodies.length > 0 ? [...targets, ...bodies] : targets);
      if (hit === null) continue;
      this.arrows.splice(this.arrows.indexOf(arrow), 1);
      if (hit < 0) continue;
      if (hit >= living.length) {
        this.onArrowBody?.(arrow.owner, bodies[hit - living.length]!.id, arrow.blow);
        continue;
      }
      const mob = living[hit]!;
      if (mob.state === 'dying') continue;
      const result = this.hit(mob, Math.cos(arrow.aim), Math.sin(arrow.aim), arrow.blow, arrow.owner, false);
      this.shotResults.push({ ...result, owner: arrow.owner });
      if (mob.health <= 0) this.shotKills.push({ mob, owner: arrow.owner });
    }
  }

  /** What a mob that a blow just killed drops into its killer's pack (MOB_LOOT), from the horde's own random numbers. */
  drop(mob: Mob): Loot {
    return rollLoot(MOB_LOOT[mob.kind], this.random);
  }

  /** Whether a mob may be on a tile at all: never in a building, and only where the world lets it hunt (a mob of a raid: MobRules.raid). */
  passable(tx: number, ty: number, raider = false): boolean {
    return this.world.buildingAt(tx, ty) === null && (raider && this.rules.raid ? this.rules.raid(tx, ty) : this.rules.hunt(tx, ty));
  }

  /** Lets a mob go where a raid goes (MobRules.raid): into a town. Only the mobs of an event (the raid on Silverspring). */
  unleash(mob: Mob): void {
    mob.raider = true;
  }

  // ---------------------------------------------------------------- states

  private enter(mob: Mob, state: MobState): void {
    if (state !== 'rite') delete mob.runes;
    // A bind ends with its blow (a blow that reaches the mob in it too).
    delete mob.bind;
    mob.state = state;
    mob.stateMs = 0;
    const brain = this.brains.get(mob.id);
    if (brain) {
      brain.parried = false;
      brain.stuckMs = 0;
      brain.anchorX = mob.x;
      brain.anchorY = mob.y;
    }
    if (state !== 'walk' && state !== 'chase' && state !== 'retreat') {
      mob.vx = 0;
      mob.vy = 0;
    }
  }

  /** A watcher that a player came close to goes in ash. Returns whether it went. */
  private watched(mob: Mob, players: readonly HordePlayer[]): boolean {
    const near = MOB_STATS[mob.kind].watch!;
    if (!players.some((p) => !p.quarry && p.state.down === 0 && Math.hypot(p.state.x - mob.x, p.state.y - mob.y) <= near)) return false;
    this.vanish(mob.id);
    return true;
  }

  /**
   * A mob goes in ash (a watcher, the Ash Warden at half of its hit points, a watcher whose band fell):
   * it is `dying` at once, with no drop and nobody's kill, and then it is gone.
   */
  vanish(id: number): void {
    const mob = this.mobs.find((m) => m.id === id);
    if (!mob || mob.state === 'dying') return;
    this.enter(mob, 'dying');
    const brain = this.brains.get(id);
    if (brain) brain.push = 0;
  }

  /** Looks for a player to hunt: the nearest one that it sees. Returns whether it found one. */
  private notice(mob: Mob, brain: Brain, players: readonly HordePlayer[]): boolean {
    if (MOB_STATS[mob.kind].watch !== undefined) return false;
    let best: HordePlayer | null = null;
    let bestD = Infinity;
    for (const p of players) {
      if (p.quarry && !mob.story) continue;
      const d = Math.hypot(p.state.x - mob.x, p.state.y - mob.y);
      if (d < bestD && this.sees(mob, p.state, MOB_STATS[mob.kind].sight * (p.sight ?? 1))) {
        best = p;
        bestD = d;
      }
    }
    if (!best) return false;
    if (MOB_STATS[mob.kind].patrol && !brain.steady) {
      this.startle(mob, best);
      return true;
    }
    brain.target = best.id;
    brain.seenX = best.state.x;
    brain.seenY = best.state.y;
    brain.lostMs = 0;
    brain.curve = this.newCurve();
    brain.queuedMs = this.clockMs;
    this.enter(mob, 'chase');
    return true;
  }

  /**
   * A patrol saw `player`: the mob and the members of its group near it (that walk or stand, and do
   * not hide) stop short and look at the player (state 'startled'). Each one already knows what it
   * does next: the number that flees is random, from none (all fight) to all, each number with the
   * same chance; the dice also choose which ones.
   */
  private startle(first: Mob, player: HordePlayer): void {
    const group = this.brains.get(first.id)!.group;
    const members = this.mobs.filter((m) => {
      if (m === first) return true;
      const b = this.brains.get(m.id)!;
      return group !== 0 && b.group === group && (m.state === 'idle' || m.state === 'walk') && b.hideMs <= 0 && Math.hypot(m.x - first.x, m.y - first.y) <= GROUP_RANGE;
    });
    // A shuffle of the members, with the horde's numbers: the first `fleeing` of them flee.
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [members[i], members[j]] = [members[j]!, members[i]!];
    }
    const fleeing = Math.floor(this.random() * (members.length + 1));
    members.forEach((m, i) => {
      const b = this.brains.get(m.id)!;
      b.flee = i < fleeing;
      b.target = player.id;
      b.seenX = player.state.x;
      b.seenY = player.state.y;
      b.lostMs = 0;
      b.curve = this.newCurve();
      b.queuedMs = this.clockMs + i;
      b.timerMs = STARTLE_MS;
      this.enter(m, 'startled');
      m.facing = facingTo(player.state.x - m.x, player.state.y - m.y, m.facing);
    });
  }

  /** The startle: it stands and looks at the player; then it flees or fights, as startle() chose. */
  private startled(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const target = brain.target === null ? undefined : players.get(brain.target);
    if (!target) {
      this.giveUp(mob, brain);
      return;
    }
    mob.facing = facingTo(target.x - mob.x, target.y - mob.y, mob.facing);
    brain.timerMs -= dt;
    if (brain.timerMs > 0) return;
    brain.curve = this.newCurve();
    if (brain.flee) {
      this.enter(mob, 'flee');
      return;
    }
    brain.queuedMs = this.clockMs;
    this.enter(mob, 'chase');
  }

  /**
   * Flees from the player, slower than a player runs (MobStats.patrol). Caught (the player close) or
   * cornered (stuck), it turns and fights; when it gets away (far, or out of sight for a moment), it
   * hides for HIDE_MS, then goes back to its loop.
   */
  private flee(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const target = brain.target === null ? undefined : players.get(brain.target);
    if (!target) {
      this.hide(mob, brain);
      return;
    }
    const d = Math.hypot(target.x - mob.x, target.y - mob.y);
    if (this.sees(mob, target, stats.forget)) brain.lostMs = 0;
    else brain.lostMs += dt;
    if (d <= stats.reach + CATCH_MARGIN || brain.stuckMs > STUCK_MS) {
      brain.flee = false;
      brain.queuedMs = this.clockMs;
      this.enter(mob, 'chase');
      return;
    }
    if (d > stats.forget || brain.lostMs > MEMORY_MS) {
      this.hide(mob, brain);
      return;
    }
    const away = Math.atan2(mob.y - target.y, mob.x - target.x);
    this.steer(mob, brain, away + brain.curve * 0.5, stats.patrol?.fleeSpeed ?? stats.retreatSpeed, dt);
  }

  /** A patrol that got away hides (HIDE_MS): it stands, looks for nobody, and then walks back to its loop. */
  private hide(mob: Mob, brain: Brain): void {
    brain.target = null;
    brain.flee = false;
    brain.hideMs = HIDE_MS;
    brain.restMs = HIDE_MS;
    brain.goal = null;
    if (brain.route) brain.routeIndex = nearestPoint(brain.route, mob);
    this.enter(mob, 'idle');
  }

  /**
   * An ambush lurks (MobStats.ambush): unseen, it creeps after the nearest player that it may hunt, to
   * where the player will be soon, in its place in the group. Close to the player it holds still, in
   * its cover. It springs at the player (spring()) within its spring distance, or after a hold of
   * `holdMs`. Without a player near, it stays where it is.
   */
  private lurk(mob: Mob, brain: Brain, players: readonly HordePlayer[], dt: number): void {
    const ambush = MOB_STATS[mob.kind].ambush ?? DEFAULT_AMBUSH;
    let best: HordePlayer | null = null;
    let bestD = LURK_RANGE;
    for (const p of players) {
      // Not a companion or a guard, a defeated player, one upstairs, or one in a town or a building.
      if (p.companion || p.quarry || p.state.down > 0 || p.state.storey !== 0) continue;
      if (!this.passable(tileOf(p.state.x), tileOf(p.state.y))) continue;
      const d = Math.hypot(p.state.x - mob.x, p.state.y - mob.y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    if (!best) {
      brain.holdMs = 0;
      mob.vx = 0;
      mob.vy = 0;
      return;
    }
    const target = best.state;
    if (bestD <= ambush.spring && this.sees(mob, target, ambush.spring)) {
      this.spring(mob, best.id, target);
      return;
    }
    if (bestD <= ambush.hold) {
      // Close: it waits in its cover for the player to come, but not for ever.
      mob.vx = 0;
      mob.vy = 0;
      mob.facing = facingTo(target.x - mob.x, target.y - mob.y, mob.facing);
      brain.holdMs += dt;
      if (brain.holdMs >= ambush.holdMs && this.sees(mob, target, ambush.hold)) this.spring(mob, best.id, target);
      return;
    }
    brain.holdMs = 0;
    const lead = AMBUSH_LEAD / 1000;
    const gx = target.x + target.vx * lead + brain.slotX;
    const gy = target.y + target.vy * lead + brain.slotY;
    this.steer(mob, brain, Math.atan2(gy - mob.y, gx - mob.x), ambush.creepSpeed, dt);
  }

  /**
   * An ambush springs at player `id` (at `at`, if known): the mob and each member of its group that
   * lurks go for the player at once, one after the other in its line.
   */
  private spring(first: Mob, id: number, at: PlayerState | null): void {
    const group = this.brains.get(first.id)!.group;
    const members = this.mobs.filter((m) => m === first || (group !== 0 && m.state === 'lurk' && this.brains.get(m.id)!.group === group));
    members.forEach((m, i) => {
      const b = this.brains.get(m.id)!;
      b.target = id;
      b.seenX = at?.x ?? m.x;
      b.seenY = at?.y ?? m.y;
      b.lostMs = 0;
      b.curve = this.newCurve();
      b.queuedMs = this.clockMs + i;
      b.holdMs = 0;
      b.home = { x: m.x, y: m.y };
      this.enter(m, 'chase');
      if (at) m.facing = facingTo(at.x - m.x, at.y - m.y, m.facing);
    });
  }

  /** Whether the area where the mob stands wants it at this hour: a spawn of its kind with its behaviour. */
  private wanted(mob: Mob, brain: Brain): boolean {
    return this.spawnsAt(tileOf(mob.x), tileOf(mob.y)).some((s) => s.kind === mob.kind && spawnBehaviour(s) === brain.behaviour);
  }

  /**
   * A mob that the horde brought for an area goes away when the area does not want it at this hour (a
   * goblin by day, a bandit at night) and no player is near enough to see it go. Returns whether it went.
   */
  private leaves(mob: Mob, brain: Brain, players: readonly HordePlayer[]): boolean {
    if (!brain.native || this.wanted(mob, brain)) return false;
    const near = LEAVE_DISTANCE * TILE_SIZE;
    if (players.some((p) => Math.hypot(p.state.x - mob.x, p.state.y - mob.y) <= near)) return false;
    this.remove(mob);
    return true;
  }

  /** The mobs of the area at a tile at this hour: MobRules.areaAt, else the population. */
  private spawnsAt(tx: number, ty: number): readonly MobSpawn[] {
    const area = this.rules.areaAt?.(tx, ty) ?? this.plainArea;
    return this.daytime ? area.day : area.night;
  }

  /** Whether the rare spawn (MobSpawn.every) of `kind` may come for player `id` now; its first wait starts here. */
  private rareReady(id: number, spawn: MobSpawn): boolean {
    let waits = this.rareAt.get(id);
    if (!waits) this.rareAt.set(id, (waits = new Map()));
    const at = waits.get(spawn.kind);
    if (at === undefined) {
      waits.set(spawn.kind, this.clockMs + spawn.every! * this.between(0.5, 1.5));
      return false;
    }
    return this.clockMs >= at;
  }

  private wander(mob: Mob, brain: Brain, dt: number, players: readonly HordePlayer[]): void {
    const stats = MOB_STATS[mob.kind];
    if (mob.state === 'idle') {
      brain.timerMs -= dt;
      if (brain.timerMs > 0) return;
      if (this.random() < PROWL_CHANCE) this.prowl(brain, players, mob.kind);
      brain.goal = this.wanderGoal(brain, mob.kind);
      if (!brain.goal) {
        brain.timerMs = this.between(800, 2000);
        return;
      }
      brain.stuckMs = 0;
      this.enter(mob, 'walk');
    }
    const goal = brain.goal ?? brain.home;
    const dx = goal.x - mob.x;
    const dy = goal.y - mob.y;
    const d = Math.hypot(dx, dy);
    if (d < 2 || brain.stuckMs > STUCK_MS) {
      this.enter(mob, 'idle');
      brain.goal = null;
      brain.timerMs = this.between(1000, 4500);
      return;
    }
    this.steer(mob, brain, Math.atan2(dy, dx), Math.min(stats.wanderSpeed, (d * 1000) / Math.max(dt, 1)), dt);
  }

  private chase(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const target = brain.target === null ? undefined : players.get(brain.target);
    if (!target) {
      this.giveUp(mob, brain);
      return;
    }
    const seen = this.sees(mob, target, stats.forget);
    if (seen) {
      brain.seenX = target.x;
      brain.seenY = target.y;
      brain.lostMs = 0;
    } else {
      brain.lostMs += dt;
    }
    // In the pack round its player, a mob stays in the fight: its home goes with it, and a moment
    // stuck behind a tree does not end the hunt (it goes the other way round).
    const close = seen && Math.hypot(target.x - mob.x, target.y - mob.y) <= stats.harass[1] + 2 * HOUND_MARGIN;
    if (close) brain.home = { x: mob.x, y: mob.y };
    const fromHome = Math.hypot(mob.x - brain.home.x, mob.y - brain.home.y);
    if (brain.lostMs > MEMORY_MS || fromHome > LEASH || (!close && brain.stuckMs > GIVE_UP_MS)) {
      this.giveUp(mob, brain);
      return;
    }
    if (brain.stuckMs > STUCK_MS && brain.detourMs <= 0) {
      // Stuck behind something: bend the other way round it for a moment.
      brain.curve = -brain.curve;
      brain.orbit = -brain.orbit;
      brain.detour = 1.6;
      brain.detourMs = 700;
    }
    const dx = (seen ? target.x : brain.seenX) - mob.x;
    const dy = (seen ? target.y : brain.seenY) - mob.y;
    const d = Math.hypot(dx, dy);
    // A caster begins its rite when an ally whose weapon does not burn is in its circle.
    const rite = stats.rite;
    if (seen && rite && brain.riteMs <= 0 && this.riteAllies(mob, rite).some((m) => m.burning === undefined)) {
      this.enter(mob, 'rite');
      mob.runes = rite.runes;
      mob.facing = facingTo(dx, dy, mob.facing);
      brain.timerMs = rite.ms;
      return;
    }
    if (seen) {
      const wait = this.waitFor(mob, brain.target!, target);
      if (wait <= 0 && d > stats.reach && brain.stuckMs > STUCK_MS) {
        // Its turn, but something keeps it from the player (a pocket between trees): it gives the
        // turn to the next one and goes to the end of the line. Without this, the whole pack waits for it.
        brain.queuedMs = this.clockMs;
        this.nextMob.delete(brain.target!);
        brain.stuckMs = 0;
        brain.anchorX = mob.x;
        brain.anchorY = mob.y;
      }
      if (wait <= 0 && d <= stats.reach && brain.turnMs <= 0) {
        this.enter(mob, 'windup');
        mob.facing = facingTo(dx, dy, mob.facing);
        brain.timerMs = stats.windupMs;
        // It aims its blow now (the flank), and chooses its shape (the shapes of the blows).
        brain.aim = Math.atan2(dy, dx);
        brain.shape = this.mechanics.has('shapes') ? shapeOf(mob.kind, this.random()) : null;
        brain.spotX = target.x;
        brain.spotY = target.y;
        if (brain.shape === 'slam') brain.timerMs = stats.windupMs * SLAM_WINDUP;
        if (brain.shape) this.event(brain.shape, mob, brain.target!);
        return;
      }
      if (brain.turnMs > 0 && d <= stats.harass[1]) {
        // It turns to a player at its flank: it stands, and then faces it.
        mob.vx = 0;
        mob.vy = 0;
        if (brain.turnMs <= TICK_MS) mob.facing = facingTo(dx, dy, mob.facing);
        return;
      }
      if (wait > 0 && d <= stats.harass[1] + HOUND_MARGIN) {
        if (wait === Infinity) {
          // Another mob has the next turn: hound the player from out of reach.
          this.hound(mob, brain, brain.target!, target, brain.ring, 1, dt);
        } else {
          // Its turn comes in `wait` ms: close in at a pace that brings it into reach just then,
          // and straight at the player at the end.
          const radius = Math.min(stats.harass[1], stats.reach + (CLOSE_IN * stats.chaseSpeed * wait) / 1000);
          this.hound(mob, brain, brain.target!, target, radius, 0.5 * Math.min(1, (radius - stats.reach) / (stats.harass[0] - stats.reach)), dt);
        }
        return;
      }
    }
    const straight = Math.atan2(dy, dx);
    // The curve: far away the mob runs at an angle to the straight line; the angle shrinks as
    // it comes near, so the path bends round to the player.
    const bend = stats.straight ? 0 : brain.curve * Math.max(0, Math.min(1, (d - stats.reach) / (stats.sight * 0.8)));
    this.steer(mob, brain, straight + bend, stats.chaseSpeed, dt);
  }

  /** The blow: a short lunge forward; then it runs away after a hit, or chases on after a miss. */
  private blow(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const lungeMs = stats.strikeMs * 0.4;
    if (mob.stateMs - dt < lungeMs) {
      const [fx, fy] = mob.facing === 'left' ? [-1, 0] : mob.facing === 'right' ? [1, 0] : mob.facing === 'up' ? [0, -1] : [0, 1];
      const share = (Math.min(mob.stateMs, lungeMs) - Math.max(0, mob.stateMs - dt)) / lungeMs;
      this.move(mob, fx * stats.lunge * share, fy * stats.lunge * share);
    }
    brain.timerMs -= dt;
    if (brain.timerMs > 0) return;
    // The end of the bind of a parry: both step apart, and a riposte puts the mob off balance.
    if (brain.parried) {
      brain.parried = false;
      delete mob.bind;
      const target = brain.target === null ? undefined : players.get(brain.target);
      if (target) this.apart(mob, target, PARRY_PUSH);
      if (brain.offBalanceMs > 0) {
        this.stagger(mob, brain, brain.offBalanceMs);
        return;
      }
    }
    // A goblin's Nimble Escape (the guards of the mobs): a step aside, in place of a run away.
    if (mob.kind === 'skirmisher' && this.mechanics.has('mobGuards') && brain.target !== null && players.has(brain.target)) {
      this.enter(mob, 'retreat');
      brain.timerMs = NIMBLE_MS;
      brain.nimble = this.random() < 0.5 ? 1 : -1;
      return;
    }
    if (brain.hit) {
      this.enter(mob, 'retreat');
      // A player with Charisma daunts it: it runs off longer.
      const daunt = brain.target === null ? 1 : (this.bodies.get(brain.target)?.daunt ?? 1);
      brain.timerMs = this.between(stats.retreatMs[0], stats.retreatMs[1]) * daunt;
      brain.curve = this.newCurve();
      return;
    }
    if (brain.target !== null && players.has(brain.target)) {
      // A miss: it goes to the end of the line.
      brain.queuedMs = this.clockMs;
      this.enter(mob, 'chase');
    } else {
      this.giveUp(mob, brain);
    }
  }

  /** Runs away from the player that it hit, on a curve, until it is time to attack again. */
  private retreat(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    const target = brain.target === null ? undefined : players.get(brain.target);
    brain.timerMs -= dt;
    if (!target) {
      this.giveUp(mob, brain);
      return;
    }
    if (brain.timerMs <= 0 || brain.stuckMs > STUCK_MS) {
      brain.curve = this.newCurve();
      brain.lostMs = 0;
      brain.queuedMs = this.clockMs;
      brain.nimble = 0;
      this.enter(mob, 'chase');
      return;
    }
    if (brain.nimble !== 0) {
      // A step aside, across the way to the player.
      const across = Math.atan2(target.y - mob.y, target.x - mob.x) + (brain.nimble * Math.PI) / 2;
      this.steer(mob, brain, across, NIMBLE_DISTANCE / (NIMBLE_MS / 1000), dt);
      return;
    }
    const away = Math.atan2(mob.y - target.y, mob.x - target.x);
    this.steer(mob, brain, away + brain.curve * 0.6, stats.retreatSpeed, dt);
  }

  private die(mob: Mob, brain: Brain, dt: number): void {
    this.knock(mob, brain, dt);
    if (mob.stateMs >= MOB_STATS[mob.kind].deathMs) this.remove(mob);
  }

  /** Reels from a blow: pushed back, facing the attacker; then it goes for the attacker. */
  private reel(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    this.knock(mob, brain, dt);
    if (mob.stateMs < brain.reelMs) return;
    if (brain.target !== null && players.has(brain.target)) {
      brain.curve = this.newCurve();
      this.enter(mob, 'chase');
    } else {
      this.giveUp(mob, brain);
    }
  }

  /** A mob reels in place for `ms` with no blow on it (state 'hurt', no push): off balance (the riposte). */
  private stagger(mob: Mob, brain: Brain, ms: number): void {
    brain.offBalanceMs = 0;
    brain.push = 0;
    brain.reelMs = ms;
    this.enter(mob, 'hurt');
  }

  /** The push of a blow, away from the attacker: fast at first, over KNOCKBACK_MS. */
  private knock(mob: Mob, brain: Brain, dt: number): void {
    const ease = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
    const share = ease(mob.stateMs / KNOCKBACK_MS) - ease((mob.stateMs - dt) / KNOCKBACK_MS);
    if (share <= 0) return;
    const d = share * brain.push;
    this.move(mob, brain.slideX * d, brain.slideY * d);
  }

  /** Stops the hunt and walks back home (it does not look for players for a while). */
  private giveUp(mob: Mob, brain: Brain): void {
    brain.target = null;
    brain.restMs = REST_MS;
    brain.goal = { x: brain.home.x, y: brain.home.y };
    brain.stuckMs = 0;
    // A marching mob goes back to its route, from the point nearest to it; a patrol to its loop.
    if (brain.route) brain.routeIndex = brain.loop ? nearestPoint(brain.route, mob) : Math.min(brain.routeIndex, nearestPoint(brain.route, mob));
    this.enter(mob, 'walk');
  }

  /** Walks the route on (Horde.march); at its end, it stands. A patrol walks its loop round and round, in its place in the group. */
  private marchOn(mob: Mob, brain: Brain, dt: number): void {
    const route = brain.route!;
    if (brain.loop) {
      const point = (i: number) => ({ x: route[i]!.x + brain.slotX, y: route[i]!.y + brain.slotY });
      // Something on the way (a tree): on to the next point.
      if (brain.stuckMs > STUCK_MS) {
        brain.routeIndex++;
        brain.stuckMs = 0;
        brain.anchorX = mob.x;
        brain.anchorY = mob.y;
      }
      if (brain.routeIndex >= route.length) brain.routeIndex = 0;
      if (Math.hypot(point(brain.routeIndex).x - mob.x, point(brain.routeIndex).y - mob.y) < ROUTE_REACH) brain.routeIndex = (brain.routeIndex + 1) % route.length;
      brain.home = { x: mob.x, y: mob.y };
      if (mob.state !== 'walk') this.enter(mob, 'walk');
      const p = point(brain.routeIndex);
      this.steer(mob, brain, Math.atan2(p.y - mob.y, p.x - mob.x), brain.routeSpeed, dt);
      return;
    }
    while (brain.routeIndex < route.length && Math.hypot(route[brain.routeIndex]!.x - mob.x, route[brain.routeIndex]!.y - mob.y) < ROUTE_REACH) brain.routeIndex++;
    brain.home = { x: mob.x, y: mob.y };
    // A watcher stands back from the end of the route, and watches.
    const end = MOB_STATS[mob.kind].watch !== undefined ? Math.max(0, route.length - WATCH_BACK) : route.length;
    if (brain.routeIndex >= end) {
      if (mob.state !== 'idle') this.enter(mob, 'idle');
      brain.timerMs = 1000;
      return;
    }
    if (mob.state !== 'walk') this.enter(mob, 'walk');
    const p = route[brain.routeIndex]!;
    this.steer(mob, brain, Math.atan2(p.y - mob.y, p.x - mob.x), brain.routeSpeed, dt);
  }

  /** The allies of a caster in the circle of its rite (alive). */
  private riteAllies(mob: Mob, rite: Rite): Mob[] {
    return this.mobs.filter((m) => m !== mob && m.state !== 'dying' && rite.allies.includes(m.kind) && Math.hypot(m.x - mob.x, m.y - mob.y) <= rite.radius);
  }

  /**
   * A rite (Rite): the caster stands and faces its target. At its end, the weapons of its allies in
   * the circle burn; then it hunts again, and its next rite waits.
   */
  private chant(mob: Mob, brain: Brain, players: ReadonlyMap<number, PlayerState>, dt: number): void {
    const rite = MOB_STATS[mob.kind].rite!;
    mob.vx = 0;
    mob.vy = 0;
    const target = brain.target === null ? undefined : players.get(brain.target);
    if (target) mob.facing = facingTo(target.x - mob.x, target.y - mob.y, mob.facing);
    brain.timerMs -= dt;
    if (brain.timerMs > 0) return;
    for (const ally of this.riteAllies(mob, rite)) ally.burning = rite.burnMs;
    brain.riteMs = rite.cooldownMs;
    if (target) {
      brain.queuedMs = this.clockMs;
      this.enter(mob, 'chase');
    } else this.giveUp(mob, brain);
  }

  // ---------------------------------------------------------------- turns

  /**
   * How long the mob must wait for its turn to attack the player `playerId` (ms): 0 if it may
   * attack now, Infinity if it is not the next in the line. The turn comes when the attacks of the
   * mobs before it are over, or in a pack nearly over (overlap()), and when its blow can hit: the
   * blow comes at the end of the wind-up, so in a pack the wind-up starts a little before the
   * guard after a stun ends (the blow still comes after it).
   */
  private waitFor(mob: Mob, playerId: number, player: PlayerState): number {
    if (this.nextUp(playerId, player) !== mob.id) return Infinity;
    const overlap = this.overlap(playerId, player);
    let wait = (player.stun > 0 ? player.stun + (this.guards.get(playerId) ?? GUARD_TICKS) + player.inspired : player.guard) * TICK_MS - overlap * MOB_STATS[mob.kind].windupMs;
    for (const attacker of this.attackers(playerId)) {
      const stats = MOB_STATS[attacker.kind];
      const timer = this.brains.get(attacker.id)!.timerMs;
      const left = attacker.state === 'windup' ? timer + stats.strikeMs : timer;
      wait = Math.max(wait, left - overlap * (stats.windupMs + stats.strikeMs));
    }
    return Math.max(0, wait);
  }

  /** How much the attacks on the player `playerId` overlap (0 to OVERLAP_MAX): more for a bigger pack round it. */
  private overlap(playerId: number, player: PlayerState): number {
    let pack = 0;
    for (const mob of this.mobs) {
      if (mob.state === 'idle' || mob.state === 'walk' || mob.state === 'dying' || mob.state === 'flee' || this.brains.get(mob.id)!.target !== playerId) continue;
      if (Math.hypot(mob.x - player.x, mob.y - player.y) <= PACK_RADIUS) pack++;
    }
    if (pack < 2) return 0;
    // A player with Charisma makes a pack press it less (a negative modifier: more).
    const presence = this.bodies.get(playerId)?.presence ?? 0;
    return Math.max(0, Math.min(OVERLAP_MAX, OVERLAP_STEP * (pack - 1) - presence));
  }

  /**
   * The mob with the next turn to attack the player `playerId`, or null. It stays the next until
   * it attacks, stops the hunt, or falls far behind. A new next is the mob that has waited
   * longest in the line, among those that hunt the player close to it.
   */
  private nextUp(playerId: number, player: PlayerState): number | null {
    const kept = this.nextMob.get(playerId);
    if (kept !== undefined) {
      const mob = this.mobs.find((m) => m.id === kept);
      if (mob && mob.state === 'chase' && this.brains.get(kept)!.target === playerId && this.near(mob, player, 2)) return kept;
    }
    let best: Mob | null = null;
    let since = Infinity;
    for (const mob of this.mobs) {
      if (mob.state !== 'chase') continue;
      const brain = this.brains.get(mob.id)!;
      if (brain.target !== playerId || brain.queuedMs >= since || !this.near(mob, player, 1)) continue;
      best = mob;
      since = brain.queuedMs;
    }
    if (best) this.nextMob.set(playerId, best.id);
    else this.nextMob.delete(playerId);
    return best?.id ?? null;
  }

  /**
   * The mobs that hunt the player `playerId` now: they chase it, wind up or strike at it, run off
   * to come back, or reel from its blow (Wisdom: the page marks those out of its view).
   */
  huntersOf(playerId: number): Mob[] {
    // A patrol that flees does not hunt: no mark for it.
    return this.mobs.filter((mob) => mob.state !== 'flee' && this.hunts(mob, playerId));
  }

  /** Whether the mob hunts the player `playerId` now (not when it wanders, or dies). */
  private hunts(mob: Mob, playerId: number): boolean {
    return mob.state !== 'idle' && mob.state !== 'walk' && mob.state !== 'lurk' && mob.state !== 'dying' && this.brains.get(mob.id)!.target === playerId;
  }

  /** The mobs that attack the player `playerId` now (in their wind-up or their blow). In a pack their attacks overlap. */
  private attackers(playerId: number): Mob[] {
    return this.mobs.filter((mob) => (mob.state === 'windup' || mob.state === 'strike') && this.brains.get(mob.id)!.target === playerId);
  }

  /** Whether the mob is close to the player: within its hounding distance and `margins` times HOUND_MARGIN. */
  private near(mob: Mob, player: PlayerState, margins: number): boolean {
    return Math.hypot(mob.x - player.x, mob.y - player.y) <= MOB_STATS[mob.kind].harass[1] + margins * HOUND_MARGIN;
  }

  /**
   * Hounds the player `playerId` (at `player`): the mob keeps `radius` from the player, moves
   * round it, keeps apart from the other mobs round the player, and looks at the player. It takes
   * a new distance and now and then a new way round. `freedom` (0 to 1) scales the moves round
   * the player: 0 goes straight to its distance.
   */
  private hound(mob: Mob, brain: Brain, playerId: number, player: PlayerState, radius: number, freedom: number, dt: number): void {
    const stats = MOB_STATS[mob.kind];
    brain.ringMs -= dt;
    if (brain.ringMs <= 0) {
      brain.ring = this.between(stats.harass[0], stats.harass[1]);
      brain.ringMs = this.between(700, 1600);
    }
    brain.orbitMs -= dt;
    if (brain.orbitMs <= 0) {
      if (this.random() < 0.5) brain.orbit = -brain.orbit;
      brain.orbitMs = this.between(1200, 3000);
    }
    const ax = mob.x - player.x;
    const ay = mob.y - player.y;
    const angle = Math.atan2(ay, ax);
    // Each other mob round the player that is closer than SPREAD round the circle pushes it on.
    let push = 0;
    for (const other of this.mobs) {
      if (other === mob || (other.state !== 'chase' && other.state !== 'windup' && other.state !== 'strike')) continue;
      if (this.brains.get(other.id)!.target !== playerId || !this.near(other, player, 1)) continue;
      const diff = normalAngle(angle - Math.atan2(other.y - player.y, other.x - player.x));
      if (Math.abs(diff) < SPREAD) push += (diff === 0 ? (mob.id < other.id ? 1 : -1) : Math.sign(diff)) * (SPREAD - Math.abs(diff));
    }
    const turn = freedom * Math.max(-1, Math.min(1, ORBIT * brain.orbit + push));
    const goalX = player.x + Math.cos(angle + turn) * radius;
    const goalY = player.y + Math.sin(angle + turn) * radius;
    const toGoal = Math.hypot(goalX - mob.x, goalY - mob.y);
    // Fast to its distance, slower round the player once it is there.
    const speed = Math.min(stats.chaseSpeed, stats.chaseSpeed * HOUND_SPEED + HOUND_PULL * Math.abs(Math.hypot(ax, ay) - radius));
    this.steer(mob, brain, Math.atan2(goalY - mob.y, goalX - mob.x), Math.min(speed, (toGoal * 1000) / Math.max(dt, 1)), dt);
    mob.facing = facingTo(-ax, -ay, mob.facing);
  }

  // ---------------------------------------------------------------- senses and movement

  /** Whether the mob sees the player: close, out in the open where it may go, and no building between. */
  private sees(mob: Mob, player: PlayerState, range = MOB_STATS[mob.kind].sight): boolean {
    // A defeated player is out of the fight.
    if (player.down > 0) return false;
    const dx = player.x - mob.x;
    const dy = player.y - mob.y;
    const d = Math.hypot(dx, dy);
    if (d > range || !this.passable(tileOf(player.x), tileOf(player.y), mob.raider)) return false;
    const steps = Math.ceil(d / 8);
    for (let i = 1; i < steps; i++) {
      if (this.world.buildingAt(tileOf(mob.x + (dx * i) / steps), tileOf(mob.y + (dy * i) / steps)) !== null) return false;
    }
    return true;
  }

  /**
   * Moves towards `heading` (radians) at `speed` for `dt`. If an obstacle is in the way, it
   * tries the ways round it, nearest first, and keeps a good one for a moment.
   */
  private steer(mob: Mob, brain: Brain, heading: number, speed: number, dt: number): void {
    const want = (speed * dt) / 1000;
    if (want <= 0) return;
    brain.detourMs -= dt;
    const tries = brain.detourMs > 0 ? [brain.detour, 0, ...DETOURS] : [0, ...DETOURS];
    let best: { x: number; y: number; gain: number; offset: number } | null = null;
    for (const offset of tries) {
      const angle = heading + offset * (brain.curve < 0 ? -1 : 1);
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const probe = { x: mob.x, y: mob.y };
      this.moveBody(probe, mob, ux * want, uy * want);
      // How far it got towards where it wants to go.
      const gain = ((probe.x - mob.x) * Math.cos(heading) + (probe.y - mob.y) * Math.sin(heading)) / want;
      const moved = Math.hypot(probe.x - mob.x, probe.y - mob.y) / want;
      if (moved > 0.6 && gain > 0.2) {
        best = { x: probe.x, y: probe.y, gain, offset };
        break;
      }
      if (!best || gain > best.gain) best = { x: probe.x, y: probe.y, gain, offset };
    }
    const startX = mob.x;
    const startY = mob.y;
    if (best && best.gain > 0) {
      mob.x = best.x;
      mob.y = best.y;
      if (best.offset !== 0 && best.offset !== brain.detour) {
        brain.detour = best.offset;
        brain.detourMs = 400;
      }
    }
    const mx = mob.x - startX;
    const my = mob.y - startY;
    mob.vx = (mx * 1000) / Math.max(dt, 1);
    mob.vy = (my * 1000) / Math.max(dt, 1);
    // Real progress: away from the last anchor point. Back and forth in one place is no progress.
    if (Math.hypot(mob.x - brain.anchorX, mob.y - brain.anchorY) > STUCK_RADIUS) {
      brain.anchorX = mob.x;
      brain.anchorY = mob.y;
      brain.stuckMs = 0;
    } else {
      brain.stuckMs += dt;
    }
    mob.facing = facingTo(mx, my, mob.facing);
  }

  /** Moves the mob by (dx, dy) with collisions. */
  private move(mob: Mob, dx: number, dy: number): void {
    this.moveBody(mob, mob, dx, dy);
  }

  /** Moves `body` (a mob or a probe for it) by (dx, dy) with the feet box of `mob`, in short steps. */
  private moveBody(body: { x: number; y: number }, mob: Mob, dx: number, dy: number): void {
    const { halfWidth, halfHeight } = MOB_STATS[mob.kind];
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_MOVE));
    for (let i = 0; i < n; i++) {
      const ground = mob.raider ? this.raidGround : this.ground;
      moveAxis(body, ground, dx / n, 0, halfWidth, halfHeight);
      moveAxis(body, ground, 0, dy / n, halfWidth, halfHeight);
    }
  }

  // ---------------------------------------------------------------- coming and going

  /**
   * Moves the home a step towards the nearest player: PROWL_STEP along the shortest way through
   * open ground where it may roam (round a town, round a lake), to the nearest place
   * PROWL_NEAREST from the player. It searches at most PROWL_SEARCH tiles; without a way, it
   * takes a straight step if that one is open.
   */
  private prowl(brain: Brain, players: readonly HordePlayer[], kind: MobKind): void {
    let nearest: PlayerState | null = null;
    let best = POPULATION_RADIUS * TILE_SIZE;
    for (const p of players) {
      const d = Math.hypot(p.state.x - brain.home.x, p.state.y - brain.home.y);
      if (d < best) {
        best = d;
        nearest = p.state;
      }
    }
    if (!nearest || best <= PROWL_NEAREST) return;
    const near = nearest;
    const start: [number, number] = [tileOf(brain.home.x), tileOf(brain.home.y)];
    const close = (tx: number, ty: number) => Math.hypot(tx * TILE_SIZE + 8 - near.x, ty * TILE_SIZE + 12 - near.y) <= PROWL_NEAREST;
    const key = (tx: number, ty: number) => `${tx},${ty}`;
    const from = new Map<string, string | null>([[key(...start), null]]);
    const queue: [number, number][] = [start];
    let goal: string | null = null;
    for (let head = 0; head < queue.length && from.size < PROWL_SEARCH; head++) {
      const [x, y] = queue[head]!;
      if (close(x, y)) {
        goal = key(x, y);
        break;
      }
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
        const k = key(nx, ny);
        if (from.has(k) || !this.open(nx, ny, kind)) continue;
        from.set(k, key(x, y));
        queue.push([nx, ny]);
      }
    }
    if (goal) {
      const path: string[] = [];
      for (let k: string | null = goal; k; k = from.get(k) ?? null) path.unshift(k);
      const [tx, ty] = path[Math.min(path.length - 1, PROWL_STEP / TILE_SIZE)]!.split(',').map(Number) as [number, number];
      brain.home = { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
      return;
    }
    const step = Math.min(PROWL_STEP, best - PROWL_NEAREST);
    const x = brain.home.x + ((near.x - brain.home.x) / best) * step;
    const y = brain.home.y + ((near.y - brain.home.y) / best) * step;
    if (this.open(tileOf(x), tileOf(y), kind)) brain.home = { x, y };
  }

  /** A place to walk to near home: an open tile where it may roam. */
  private wanderGoal(brain: Brain, kind: MobKind): { x: number; y: number } | null {
    for (let tries = 0; tries < 8; tries++) {
      const angle = this.random() * 2 * Math.PI;
      const r = this.random() * WANDER_RADIUS;
      const x = brain.home.x + Math.cos(angle) * r;
      const y = brain.home.y + Math.sin(angle) * r;
      if (this.open(tileOf(x), tileOf(y), kind)) return { x: tileOf(x) * TILE_SIZE + TILE_SIZE / 2, y: tileOf(y) * TILE_SIZE + 12 };
    }
    return null;
  }

  /** A tile where a mob (of `kind`) may stand still: roam ground, nothing solid on it. */
  private open(tx: number, ty: number, kind?: MobKind): boolean {
    return this.rules.roam(tx, ty, kind) && this.passable(tx, ty) && this.world.solidBox(tx, ty) === null;
  }

  /**
   * Brings new mobs where players have fewer than the area wants at this hour (MobRules.areaAt where
   * the player stands, else MobRules.population), one at a time (a patrol or an ambush: one group), out
   * of their sight; a rare spawn only after its wait (MobSpawn.every). An ambush comes ahead of its
   * player, where it walks or faces, and hides.
   */
  private populate(dt: number, players: readonly HordePlayer[]): void {
    this.spawnMs -= dt;
    if (this.spawnMs > 0 || players.length === 0) return;
    this.spawnMs = SPAWN_GAP_MS;
    if (this.living >= MAX_MOBS) return;
    for (const id of [...this.rareAt.keys()]) if (!players.some((p) => p.id === id)) this.rareAt.delete(id);
    let best: { player: PlayerState; id: number; spawn: MobSpawn; short: number } | null = null;
    for (const p of players) {
      for (const spawn of this.spawnsAt(tileOf(p.state.x), tileOf(p.state.y))) {
        if (spawn.count <= 0) continue;
        if (spawn.every !== undefined && !this.rareReady(p.id, spawn)) continue;
        let have = 0;
        for (const mob of this.mobs) {
          if (mob.kind === spawn.kind && mob.state !== 'dying' && Math.hypot(mob.x - p.state.x, mob.y - p.state.y) <= POPULATION_RADIUS * TILE_SIZE) have++;
        }
        if (spawn.count - have > (best?.short ?? 0)) best = { player: p.state, id: p.id, spawn, short: spawn.count - have };
      }
    }
    if (!best) return;
    const { kind } = best.spawn;
    const behaviour = spawnBehaviour(best.spawn);
    const ambush = behaviour === 'ambush';
    for (let tries = 0; tries < 16; tries++) {
      // An ambush: ahead of the player, a little to a side. The others: all round, out of sight.
      const angle = ambush ? headingOf(best.player) + this.between(-0.6, 0.6) : this.random() * 2 * Math.PI;
      const r = (ambush ? this.between(AMBUSH_DISTANCE[0], AMBUSH_DISTANCE[1]) : this.between(SPAWN_DISTANCE[0], SPAWN_DISTANCE[1])) * TILE_SIZE;
      const tx = tileOf(best.player.x + Math.cos(angle) * r);
      const ty = tileOf(best.player.y + Math.sin(angle) * r);
      if (!this.open(tx, ty, kind)) continue;
      const x = tx * TILE_SIZE + TILE_SIZE / 2;
      const y = ty * TILE_SIZE + 12;
      const nearest = (ambush ? AMBUSH_NEAREST : SPAWN_DISTANCE[0]) * TILE_SIZE;
      if (players.some((p) => Math.hypot(p.state.x - x, p.state.y - y) < nearest)) continue;
      let mobs: Mob[];
      if (behaviour === 'patrol') {
        const group = best.spawn.group ?? MOB_STATS[kind].patrol?.group ?? [1, 1];
        mobs = this.spawnPatrol(kind, x, y, Math.max(group[0], Math.min(group[1], best.short)));
      } else if (ambush) {
        const group = best.spawn.group ?? MOB_STATS[kind].ambush?.group ?? DEFAULT_AMBUSH.group;
        const size = group[0] + Math.floor(this.random() * (group[1] - group[0] + 1));
        mobs = this.spawnAmbush(kind, x, y, Math.max(1, Math.min(size, best.short)));
      } else mobs = [this.spawn(kind, x, y)];
      for (const mob of mobs) {
        const brain = this.brains.get(mob.id)!;
        brain.native = true;
        brain.behaviour = behaviour;
      }
      if (best.spawn.every !== undefined) this.rareAt.get(best.id)!.set(kind, this.clockMs + best.spawn.every * this.between(0.5, 1.5));
      return;
    }
  }

  /** A wandering mob far from every player goes away. Returns whether it went. */
  private despawn(mob: Mob, players: readonly HordePlayer[]): boolean {
    const far = DESPAWN_DISTANCE * TILE_SIZE;
    if (players.some((p) => Math.hypot(p.state.x - mob.x, p.state.y - mob.y) <= far)) return false;
    this.remove(mob);
    return true;
  }

  private remove(mob: Mob): void {
    const i = this.mobs.indexOf(mob);
    if (i >= 0) this.mobs.splice(i, 1);
    this.brains.delete(mob.id);
  }

  private newCurve(): number {
    return (this.random() < 0.5 ? -1 : 1) * this.between(CURVE[0], CURVE[1]);
  }

  private between(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
}
