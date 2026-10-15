import type { CharacterClass, Race } from './character.ts';
import type { MobKind } from './mobs.ts';

/**
 * The mechanics of combat of the melee draft (docs/drafts/combat-melee.md: its proposals), each one a
 * switch that is off by default. Only the sandbox of an admin turns them on now (the page's
 * sandbox.ts; Fede, 2026-10-15: "I test them myself"): the Room never does, so a shared world plays as
 * before, and the wire does not change. Fede tests each one alone or with others, and keeps or drops
 * it. A mechanic that stays becomes a rule of the game, without its switch.
 *
 * The player's side of a mechanic reads the switches from its StepTraits (player.ts, stepPlayer); the
 * mobs' side from Horde.mechanics. Where the draft gives a sure effect (no roll), the sandbox gives
 * the dice an edge instead (Fede, 2026-10-15: "adapt them to dice whenever it makes more sense").
 */

/** The mechanics, in the order of the proposals of the draft. */
export const MECHANICS = ['grades', 'riposte', 'front', 'flank', 'parry', 'guard', 'shove', 'clash', 'reactions', 'shapes', 'mobGuards', 'stamina'] as const;

export type Mechanic = (typeof MECHANICS)[number];

/** The mechanics that are on. */
export type Mechanics = ReadonlySet<Mechanic>;

/** No mechanic on: the game as it is. */
export const NO_MECHANICS: Mechanics = new Set();

/**
 * Something that a mechanic did in a fight, for the page to show (a word over the player or a mob):
 * `sharp`, a sharp evade (the grades of a brace); `riposte`, a mob off balance after an evade (the
 * riposte); `side` and `behind`, a blow from the side or the back of a brace (the front of a brace); `flank`, a
 * mob that must turn to a player at its side (the flank); `parry`, a blow that a parry turned (the
 * parry); `block`, a blow that a shield turned, and `broken`, a heavy blow that broke a guard (the
 * guard stance); `shoved`, a mob that a shove knocked down, `held`, a mob that a shove did not move, and
 * `tooBig`, a mob too big to shove (the shove); `clash`, `clashWon` and `clashLost`, two blows that met:
 * a tie, a win and a loss of the player (the clash); `shield`, `deflect`, `caught`, `uncanny`, `protect`
 * and `rage`, the reactions of the classes; `thrust`, `sweep`, `slam` and `bite`, the tell of a wind-up
 * (the shapes of the blows); `raise`, a hobgoblin that raises its shield, and `mobParry`, a bandit that
 * parried a blow (the guards of the mobs).
 */
export type MechanicEventKind =
  | 'sharp'
  | 'riposte'
  | 'side'
  | 'behind'
  | 'flank'
  | 'parry'
  | 'block'
  | 'broken'
  | 'shoved'
  | 'held'
  | 'tooBig'
  | 'clash'
  | 'clashWon'
  | 'clashLost'
  | 'shield'
  | 'deflect'
  | 'caught'
  | 'uncanny'
  | 'protect'
  | 'rage'
  | 'raise'
  | 'mobParry'
  | Shape;

export interface MechanicEvent {
  readonly kind: MechanicEventKind;
  /** The mob, and the player (an id of HordePlayer). */
  readonly mob: number;
  readonly player: number;
}

// ---------------------------------------------------------------- 1. the grades of a brace

/**
 * The grade of a brace (proposal 1): the time from its start to a mob's blow. `sharp` in its first
 * SHARP_TICKS (0.1 s): the mob rolls with disadvantage against the AC of the brace (the draft: a sure
 * evade). `clean` up to CLEAN_TICKS (0.2 s): the AC of the brace, as without the grades. `late` after it,
 * also while the step back is held: the tension goes, and only half of what the brace adds to the AC
 * counts (LATE_SHARE; at least 1).
 */
export type BraceGrade = 'sharp' | 'clean' | 'late';

export const SHARP_TICKS = 6;
export const CLEAN_TICKS = 12;
export const LATE_SHARE = 0.5;

/** The grade of a brace that began `age` ticks ago (PlayerState.braceAge: 1 in its first tick). */
export function braceGrade(age: number): BraceGrade {
  return age <= SHARP_TICKS ? 'sharp' : age <= CLEAN_TICKS ? 'clean' : 'late';
}

/** What a late brace adds to the AC: LATE_SHARE of `braceAc`, rounded down, at least 1. */
export function lateBraceAc(braceAc: number): number {
  return partBraceAc(braceAc, LATE_SHARE);
}

/** A share of what a brace adds to the AC (a late brace, a blow from the side), rounded down, at least 1 (0 without a brace). */
export function partBraceAc(braceAc: number, share: number): number {
  return braceAc <= 0 ? 0 : Math.max(1, Math.floor(braceAc * share));
}

// ---------------------------------------------------------------- 2. the riposte

/**
 * The riposte (proposal 2; the Riposte of the Battle Master, and advantage): an evade puts the mob off
 * balance for RIPOSTE_MS. It reels in place (state 'hurt', with no push and no flash): it cannot wind up.
 * The next blow of the player on it in that time rolls with advantage and adds the INT opening, as on a
 * mob in its wind-up (Mob.exposed). With the grades of a brace, a sharp or a clean evade gives it, not a
 * late one (Fede, 2026-10-15).
 */
export const RIPOSTE_MS = 400;

// ---------------------------------------------------------------- 3. the front of a brace

/**
 * The front of a brace (proposal 3; Fede's three sectors, 2026-10-15): the way of a mob from the player,
 * against the way that the player struck (PlayerState.aim), gives a sector of a quarter of the circle.
 * From the front (within FULL_ANGLE of the aim) the brace counts in full. From a side (up to SIDE_ANGLE)
 * it adds only SIDE_SHARE of its AC (rounded down, at least 1; after the grade of the brace), and its
 * evade, its grade and its riposte stay. From the back it does not count: the plain AC, and a miss
 * glances off. With one mob nothing changes; with two or three the player must keep them in front of it
 * (positioning).
 */
export type BraceSector = 'front' | 'side' | 'back';

export const FULL_ANGLE = Math.PI / 4;
export const SIDE_ANGLE = (3 * Math.PI) / 4;
export const SIDE_SHARE = 0.5;

/** The sector of a brace of a player at (px, py) that struck at `aim` (radians), for a mob at (x, y). */
export function braceSector(px: number, py: number, aim: number, x: number, y: number): BraceSector {
  if (inFront(px, py, aim, x, y, FULL_ANGLE)) return 'front';
  return inFront(px, py, aim, x, y, SIDE_ANGLE) ? 'side' : 'back';
}

/** The front of a guard stance (the guard stance, mechanics.ts): within this angle of the aim. */
export const FRONT_ANGLE = Math.PI / 2;

/** Whether (x, y) is in front of a player at (px, py) that faces `aim` (radians): within `angle` of it. */
export function inFront(px: number, py: number, aim: number, x: number, y: number, angle = FRONT_ANGLE): boolean {
  const dx = x - px;
  const dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true;
  return (dx * Math.cos(aim) + dy * Math.sin(aim)) / d >= Math.cos(angle) - 1e-9;
}

// ---------------------------------------------------------------- 4. the flank

/**
 * The flank (proposal 4, the sidestep: the jump from a brace is its move; this is the rest of it). A mob
 * aims its blow when its wind-up starts. When its blow does not hit, and the player is then more than
 * FLANK_ANGLE off that aim (a jump to the side in the wind-up), the player is at its flank: the mob must
 * turn for TURN_MS before its next wind-up, and the next blow of the player on it, in its blow and its
 * turn, rolls with advantage (the optional rule of 5e for flanking; Mob.exposed).
 */
export const FLANK_ANGLE = (40 * Math.PI) / 180;
export const TURN_MS = 400;

/** Whether a player at (x, y) is at the flank of a mob at (mx, my) that aims its blow at `aim` (radians). */
export function atFlank(mx: number, my: number, aim: number, x: number, y: number): boolean {
  return !inFront(mx, my, aim, x, y, FLANK_ANGLE);
}

// ---------------------------------------------------------------- 5. the parry

/**
 * The parry (proposal 5; the reaction Parry of the SRD knight and bandit captain): an attack of a
 * melee weapon while a mob's blow comes, in the last PARRY_WINDOW_TICKS of its wind-up, is a parry, not
 * a blow: the weapon meets the mob's weapon. The player stands in its guard (PlayerState.parry) and its
 * proficiency bonus goes on its AC against that blow; in the last SHARP_PARRY_TICKS the mob also rolls
 * with disadvantage (the draft: a sure parry), and a miss then gives a riposte (with the riposte on).
 * A miss is a parry: the steel rings, the weapons stay locked for PARRY_BIND_MS (a bind: the mob holds
 * its blow, Mob.bind, and the player its guard, unless it moves or acts), and then both step back
 * PARRY_PUSH (Fede, 2026-10-15: a longer clash of the weapons, with sparks and a flash on the page). A
 * hit takes its damage, as before. Earlier than the window, an attack is a blow into the wind-up, as
 * before (the INT opening). Not a bow, not an empty hand.
 */
export const PARRY_WINDOW_TICKS = 9;
export const SHARP_PARRY_TICKS = 5;
/** The player stands in its guard this long (ticks) after the start of a parry. */
export const PARRY_TICKS = 15;
/** A parry pushes the player and the mob this far apart (world pixels), at the end of its bind. */
export const PARRY_PUSH = 4;
/** The weapons of a parry stay locked this long after the blow (ms). */
export const PARRY_BIND_MS = 300;

// ---------------------------------------------------------------- 6. the guard stance and the shield block

/**
 * The guard stance (proposal 6; the Dodge action of 5e, from the front only): a hold of the dodge input
 * (MoveInput.guard; a tap stays a roll) raises a guard. The player walks at GUARD_SPEED, faces the way of
 * its aim (the mouse, or the way it struck), and does not attack or roll. A blow from its front (within
 * FRONT_ANGLE) rolls with disadvantage. The guard costs GUARD_STAMINA each second; with a shield it is
 * a block, and costs BLOCK_STAMINA for each blow that it turns, and nothing each second. With no
 * stamina the guard drops. A heavy blow (a bugbear's, or a slam: the shapes of the blows) breaks the
 * guard: no disadvantage, and the player reels for GUARD_BREAK_TICKS (PlayerState.reel: no guard after
 * it, as after a stun).
 */
export const GUARD_SPEED = 0.5;
export const GUARD_STAMINA = 12;
export const BLOCK_STAMINA = 15;
export const GUARD_BREAK_TICKS = 30;

// ---------------------------------------------------------------- 7. the shove

/**
 * The shove (proposal 7; the Shove of 5e; Fede's rules of 2026-10-15). A dodge with a direction always
 * rolls (or jumps, in a brace). A dodge with no direction (the player stands) is a grab
 * (PlayerState.grab, GRAB_TICKS): the player reaches out the way it faces, and cannot move or attack
 * until the grab ends. It costs the stamina of the roll and the wait between dodges. While the hands are
 * out (from GRAB_REACH_TICKS to GRAB_HOLD_TICKS), the first living mob in its reach within SHOVE_ARC of
 * that way is caught (Horde.step), and the grab becomes a struggle; with none, the grab ends on nothing.
 * The player and the mob struggle for STRUGGLE_MS: the mob steps in to STRUGGLE_GAP
 * (state 'struggle'), and both push; the player stands (PlayerState.shove). Then the dice: d20 + the
 * player's STR modifier and proficiency bonus (PlayerTraits.athletics) against d20 + the better of the
 * mob's STR and DEX modifiers (MOB_BODY); a tie goes to the mob. A win knocks the mob back SHOVE_PUSH as
 * it falls (FALL_MS), and it lies on the ground SHOVE_KNOCK_MS, then stands up (RISE_MS) (state
 * 'floored'): it cannot wind up, and blows on it roll with advantage (Mob.exposed); a blow does not get
 * it up. A loss: both go back to the fight. A player cannot shove a mob more than one size larger (5e):
 * a halfling or a gnome cannot shove a brute or a worg; it struggles, and the mob does not move. A hit
 * on the player in the struggle ends it.
 */
export const SHOVE_ARC = Math.PI / 4;
/** A grab lasts this many ticks (0.4 s); the hands are out from GRAB_REACH_TICKS to GRAB_HOLD_TICKS of it. */
export const GRAB_TICKS = 24;
export const GRAB_REACH_TICKS = 6;
export const GRAB_HOLD_TICKS = 14;
export const STRUGGLE_MS = 500;
/** The player stands this many ticks in a struggle: STRUGGLE_MS, and 2 more, so that the dice come first. */
export const SHOVE_TICKS = 32;
/** In a struggle the mob steps in to this distance from the player (world pixels). */
export const STRUGGLE_GAP = 13;
export const FALL_MS = 250;
export const SHOVE_KNOCK_MS = 800;
export const RISE_MS = 450;
export const SHOVE_PUSH = 16;

/** The sizes of 5e, from small to big. */
export const SIZES = ['tiny', 'small', 'medium', 'large', 'huge'] as const;
export type Size = (typeof SIZES)[number];

/** The size of each race (5e): a gnome and a halfling are small. */
export const RACE_SIZE: Readonly<Record<Race, Size>> = {
  human: 'medium',
  dwarf: 'medium',
  elf: 'medium',
  gnome: 'small',
  'half-elf': 'medium',
  halfling: 'small',
  'half-orc': 'medium',
};

/** The body of each kind of mob for a shove (its SRD stat block): its size and its STR and DEX modifiers. */
export const MOB_BODY: Readonly<Record<MobKind, { readonly size: Size; readonly str: number; readonly dex: number }>> = {
  imp: { size: 'tiny', str: -3, dex: 3 },
  brute: { size: 'large', str: 3, dex: 0 },
  goblin: { size: 'small', str: -1, dex: 2 },
  worg: { size: 'large', str: 3, dex: 1 },
  hobgoblin: { size: 'medium', str: 1, dex: 1 },
  bugbear: { size: 'medium', str: 2, dex: 2 },
  devastator: { size: 'medium', str: 1, dex: 1 },
  hound: { size: 'medium', str: 3, dex: 1 },
  watcher: { size: 'medium', str: 0, dex: 2 },
  seeker: { size: 'medium', str: 2, dex: 0 },
  adept: { size: 'medium', str: 0, dex: 0 },
  warden: { size: 'medium', str: 3, dex: 1 },
  skirmisher: { size: 'small', str: -1, dex: 2 },
  bandit: { size: 'medium', str: 0, dex: 1 },
};

/** Whether a player of size `player` can shove a mob of size `mob`: at most one size larger (5e). */
export function canShove(player: Size, mob: Size): boolean {
  return SIZES.indexOf(mob) - SIZES.indexOf(player) <= 1;
}

// ---------------------------------------------------------------- 8. the clash

/**
 * The clash (proposal 8): a blow of the player that starts in the last CLASH_TICKS of the wind-up of a
 * mob that hunts it, face to face (the mob in the reach of the blow), meets the mob's blow: each side
 * rolls its attack (d20 + its attack bonus), and the higher wins. Nobody takes damage, and the mob's
 * blow does not land. The mob that loses reels (as from a blow); the player that loses reels for
 * CLASH_REEL_TICKS (PlayerState.reel: no guard after it). A tie: both step CLASH_PUSH back, and the mob
 * stops its blow for CLASH_PAUSE_MS. With the parry on, an attack in the last ticks of a wind-up is a
 * parry: the parry comes first.
 */
export const CLASH_TICKS = 3;
export const CLASH_REEL_TICKS = 24;
export const CLASH_PUSH = 4;
export const CLASH_PAUSE_MS = 250;

// ---------------------------------------------------------------- 9. the reactions of the classes

/**
 * The reactions of the classes (proposal 9: what the SRD gives some classes for the same moment; a class
 * feature of levels 1 to 5, here at every level):
 * - A wizard or a sorcerer: the spell Shield. Its brace is a Shield: SHIELD_AC more on its AC (in place
 *   of the AC of the brace) against every blow, from every side, from the start of the brace to
 *   SHIELD_AFTER_TICKS after its end (PlayerState.ward).
 * - A monk: Deflect Missiles. An arrow that hits it in a brace loses 1d10 + its DEX modifier + its level
 *   of damage (PlayerTraits.deflect); at 0 it catches the arrow (no damage, no stun). And Patient
 *   Defense: its guard stance costs no stamina.
 * - A rogue: Uncanny Dodge. Once in UNCANNY_TICKS, a hit in its own attack (out of a brace) takes half of
 *   its damage (PlayerState.uncanny).
 * - A fighter: the fighting style Protection. With a shield, its brace covers another player (or a
 *   companion) within PROTECT_RANGE: a blow on that one rolls with disadvantage.
 * - A barbarian: Rage. It needs no brace: its first attack starts a rage of RAGE_TICKS that halves the
 *   damage of each hit (PlayerState.rage), and the next rage waits RAGE_REST_TICKS after its end.
 * - A ranger: none (the kite stays its art). The others: none in the draft.
 */
export const SHIELD_AC = 5;
export const SHIELD_AFTER_TICKS = 18;
export const UNCANNY_TICKS = 1800;
export const PROTECT_RANGE = 16;
export const RAGE_TICKS = 3600;
export const RAGE_REST_TICKS = 3600;

/** Whether a class casts the spell Shield in its brace (the reactions). */
export function shieldCaster(cls: CharacterClass | undefined): boolean {
  return cls === 'wizard' || cls === 'sorcerer';
}

// ---------------------------------------------------------------- 10. the shapes of the blows

/**
 * The shapes of a mob's blow (proposal 10): each kind of mob has one or two, each with its own tell and
 * its own answer. The mob aims its blow when its wind-up starts (the flank), and the shape gives where
 * the blow lands; a player out of it at the end of the wind-up is not hit (no roll), as out of reach.
 * - A thrust (hobgoblin, bandit, goblin): straight, within THRUST_ARC of the aim, and a little further
 *   (THRUST_REACH). A jump to the side gets out of it.
 * - A sweep (brute, bugbear): wide, within SWEEP_ARC: a jump to the side stays in it.
 * - A slam (the brute now and then, SLAM_SHARE; the Devastator): overhead, with a wind-up SLAM_WINDUP
 *   times as long, on the place where the player stood when it began (within SLAM_RADIUS). A roll or a
 *   jump gets out of it; a brace, a guard and a parry do not count against it (a guard breaks).
 * - A bite (worg, cinder hound): quick and narrow, within BITE_ARC.
 * The page shows the shape as a word over the mob when its wind-up starts: its tell, until the mobs get
 * a wind-up of their own for each shape (art).
 */
export type Shape = 'thrust' | 'sweep' | 'slam' | 'bite';

export const THRUST_ARC = (30 * Math.PI) / 180;
export const THRUST_REACH = 4;
export const SWEEP_ARC = (100 * Math.PI) / 180;
export const BITE_ARC = (60 * Math.PI) / 180;
export const SLAM_RADIUS = 14;
export const SLAM_WINDUP = 1.5;
export const SLAM_SHARE = 1 / 3;

/** The shapes of the blow of each kind (the others have none: their blows land as before). */
export const MOB_SHAPES: Readonly<Partial<Record<MobKind, { readonly shape: Shape; readonly slam?: number }>>> = {
  brute: { shape: 'sweep', slam: SLAM_SHARE },
  bugbear: { shape: 'sweep' },
  devastator: { shape: 'slam' },
  hobgoblin: { shape: 'thrust' },
  bandit: { shape: 'thrust' },
  skirmisher: { shape: 'thrust' },
  worg: { shape: 'bite' },
  hound: { shape: 'bite' },
};

/** The shape of the next blow of a mob of `kind` (`roll`: a random number from 0 to 1, for a slam now and then), or null. */
export function shapeOf(kind: MobKind, roll: number): Shape | null {
  const shapes = MOB_SHAPES[kind];
  if (!shapes) return null;
  return shapes.slam !== undefined && roll < shapes.slam ? 'slam' : shapes.shape;
}

/**
 * Whether a blow of `shape` from a mob at (mx, my), aimed at `aim` (radians) with its reach `hitRange`,
 * lands on a player at (x, y); a slam lands on the spot (sx, sy) where the player stood.
 */
export function inShape(shape: Shape, mx: number, my: number, aim: number, hitRange: number, x: number, y: number, sx: number, sy: number): boolean {
  if (shape === 'slam') return Math.hypot(x - sx, y - sy) <= SLAM_RADIUS;
  const d = Math.hypot(x - mx, y - my);
  if (shape === 'thrust') return d <= hitRange + THRUST_REACH && (d <= 8 || inFront(mx, my, aim, x, y, THRUST_ARC));
  return d <= hitRange && inFront(mx, my, aim, x, y, shape === 'sweep' ? SWEEP_ARC : BITE_ARC);
}

// ---------------------------------------------------------------- 11. the guards of the mobs

/**
 * The guards of the mobs (proposal 11): the same moves for the mobs, so that a fight has two sides.
 * - The hobgoblin (SRD: a shield, AC 18) raises its shield after its blow for SHIELD_UP_MS: a blow of a
 *   player on it rolls with disadvantage (Mob.guardUp).
 * - The goblin of the forest (the SRD goblin: Nimble Escape) steps aside after its blow, NIMBLE_DISTANCE
 *   in NIMBLE_MS, in place of a run away: it stays in melee, out of the reach of a riposte.
 * - The bandit (in the place of the bandit captain of the draft, which needs art: SRD Parry) parries the
 *   first blow after its own: BANDIT_PARRY_AC on its AC against that blow (Mob.parryReady).
 * - The bugbear waits out a brace: when its wind-up ends with its target in a brace, it holds the blow up
 *   to FEINT_MS more, and strikes when the brace ends (Mob.feint: no glint of INT 15 meanwhile, so the
 *   reader knows).
 * - The brute keeps no guard: the plain foe, to learn on.
 */
export const SHIELD_UP_MS = 500;
export const NIMBLE_DISTANCE = 16;
export const NIMBLE_MS = 250;
export const BANDIT_PARRY_AC = 2;
export const FEINT_MS = 400;

// ---------------------------------------------------------------- 12. a price in stamina

/**
 * A price in stamina (proposal 12; CON): a defence in melee costs stamina. An evade (a miss in a brace)
 * costs EVADE_STAMINA, but a sharp one (the grades) nothing; a parry PARRY_STAMINA; a shove
 * SHOVE_STAMINA in place of the stamina of the roll. The guard stance and the shield block have their
 * own price (GUARD_STAMINA, BLOCK_STAMINA). With no stamina there is no brace (a brace in progress drops)
 * and no parry: the player must leave melee to breathe. The attacks already cost stamina
 * (ATTACK_STAMINA, built on 2026-10-14).
 */
export const EVADE_STAMINA = 10;
export const PARRY_STAMINA = 10;
export const SHOVE_STAMINA = 20;
