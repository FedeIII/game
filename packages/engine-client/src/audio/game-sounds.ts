/**
 * The sounds of the game (2026-10-12): what the player does and meets, as effects (audio/fx.ts) and
 * the sound of the places (audio/sounds.ts). game.ts tells it what happens; for the things that it
 * sees in each frame (the mobs, the arrows, the player's steps), it compares the frame with the last
 * one and plays what changed:
 *   the player: a swing, a bow, a cantrip; a blow on flesh or on armour, a critical hit; a hit that it
 *     takes, a glancing blow, a dodge, a fall; its steps on grass, earth, sand, stone, wood or water
 *   the mobs: their voices (they spot the player, gather for a blow, are hurt, die), their swings,
 *     their arrows and fire bolts
 *   the things: doors, chests, locks, herbs, a buried cache, coins, items, drinks, the GUI
 *   the places: an ambience for each mood (the night forest, a town, a room...), and near the player
 *     the water, a fire, a fountain, a forge, louder as it comes near, from their side
 */
import { Ground, MOB_KINDS, type AttackGear, type MobKind, type World } from '@game/engine';
import { audio } from './audio.ts';
import { mobVoice, type VoiceEvent } from './creatures.ts';
import { isPlaceMood, type Mood, type PlaceMood } from './director.ts';
import { FX_INSTRUMENTS, FxPlayer, spatial, type FxId } from './fx.ts';
import type { AmbienceId, LayerId } from './sounds.ts';

const TILE = 16;
/** A step every this many world pixels walked. */
export const STRIDE = 20;
/** A mob's voice is heard this far (world pixels). */
const VOICE_RANGE = 16 * TILE;
/** A mob speaks at most once in this long (ms), and spots the player with a call at most once in ALERT_MS. */
const VOICE_GAP_MS = 900;
const ALERT_MS = 8000;
/** The mobs whose blows ring on armour. */
const ARMOURED: ReadonlySet<MobKind> = new Set(['hobgoblin', 'warden', 'devastator']);
/** The big mobs: a heavy swing. */
const HEAVY: ReadonlySet<MobKind> = new Set(['brute', 'bugbear', 'warden', 'devastator', 'worg']);

/** The step sound of a ground. */
export function stepOf(ground: Ground): FxId | null {
  switch (ground) {
    case Ground.Grass:
    case Ground.DarkGrass:
      return 'stepGrass';
    case Ground.Dirt:
      return 'stepDirt';
    case Ground.Sand:
      return 'stepSand';
    case Ground.Cobble:
    case Ground.FloorStone:
      return 'stepStone';
    case Ground.Floor:
      return 'stepWood';
    case Ground.FloorEarth:
      return 'stepEarth';
    case Ground.Shallows:
      return 'stepWater';
    default:
      return null;
  }
}

/** The ambience of each place by day and at night (2026-10-13: the sound follows the hour; audio/sounds.ts). */
export const PLACE_AMBIENCES: Readonly<Record<PlaceMood, { readonly day: AmbienceId; readonly night: AmbienceId }>> = {
  wilds: { day: 'forestDay', night: 'forest' },
  town: { day: 'townDay', night: 'townNight' },
  haven: { day: 'haven', night: 'havenNight' },
  home: { day: 'hearthDay', night: 'hearth' },
  chapel: { day: 'candle', night: 'candle' },
  ruins: { day: 'ruinsDay', night: 'ruins' },
  camp: { day: 'camp', night: 'campNight' },
  shrine: { day: 'shrine', night: 'shrineNight' },
};

/** The ambience of a mood of a place at its hour; inside a building that has no mood of its own, a room's (the same at any hour). */
export function ambienceOf(mood: Mood, indoors: boolean, night: boolean): AmbienceId | null {
  if (indoors && mood !== 'home' && mood !== 'chapel') return 'indoor';
  if (!isPlaceMood(mood)) return null;
  return PLACE_AMBIENCES[mood][night ? 'night' : 'day'];
}

/** How long the day and the night ambience of a place crossfade when the hour changes (s): slower than a change of place. */
export const HOUR_AMBIENCE_FADE = 12;
/** How long the ambience crossfades when the player comes into another place (s). */
const PLACE_AMBIENCE_FADE = 2.5;

/** What a mob's change of state says: a voice for the moment, or nothing. */
export function voiceOfChange(before: string | undefined, after: string): VoiceEvent | null {
  if (after === before) return null;
  if (after === 'dying') return 'death';
  if (after === 'hurt') return 'hurt';
  if (after === 'windup') return 'windup';
  // A patrol that sees the player yelps as it stops short (protocol 36).
  if (after === 'startled') return 'alert';
  // An ambush that springs out of hiding shouts (protocol 40).
  if (after === 'chase' && (before === undefined || before === 'idle' || before === 'walk' || before === 'ride' || before === 'rite' || before === 'lurk')) return 'alert';
  return null;
}

/** The fixtures whose sound carries (a layer), by their kind. */
const LAYER_OF: Readonly<Record<string, LayerId>> = { campfire: 'fire', brand: 'fire', cauldron: 'fire', fountain: 'fountain', forge: 'forge', anvil: 'forge' };
/** How far each layer is heard (tiles). */
const LAYER_RANGE: Readonly<Record<LayerId, number>> = { water: 9, fire: 9, fountain: 11, forge: 13 };

interface MobSeen {
  state: string;
  voiceAt: number;
  alertAt: number;
}

export interface MobSound {
  readonly id: number;
  readonly kind: MobKind;
  readonly state: string;
  readonly x: number;
  readonly y: number;
}

export interface ArrowSound {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly fire: boolean;
}

export class GameSounds {
  readonly fx = new FxPlayer(audio);
  private readonly mobs = new Map<number, MobSeen>();
  private arrows = new Map<number, ArrowSound>();
  private walked = 0;
  private last: { x: number; y: number } | null = null;
  private nextLayers = 0;
  private ambience: AmbienceId | null = null;
  /** The place of the ambience (its mood, and inside or not): a new ambience in the same place is a change of the hour. */
  private ambienceWhere: string | null = null;
  private voicesAt: number[] = [];

  /** Loads the recorded sounds of the effects, renders the common ones, and listens to the GUI. */
  start(): void {
    audio.preload(FX_INSTRUMENTS);
    this.fx.prepare(['swing', 'hitFlesh', 'stepGrass', 'stepDirt', 'stepWood', 'stepStone', 'hurt', 'mobFall', 'coins', 'pickup', 'uiOpen']);
    // The panels: a page turns for the journal and the map, a rustle for the others.
    window.addEventListener('game:panel-open', (event) => {
      const id = (event as CustomEvent<string>).detail;
      this.fx.play(id === 'journal' || id === 'map' ? 'page' : 'uiOpen', { gain: 0.8 });
    });
    // A press on a button of the GUI (not the buttons of the fight and the action, which have their own sounds).
    document.addEventListener(
      'pointerdown',
      (event) => {
        const button = event.target instanceof Element ? event.target.closest('button') : null;
        // The answers of a conversation have their own sound (the panel's `sound`).
        if (button && !['attack', 'dodge', 'action'].includes(button.id) && !button.classList.contains('conversation-answer')) this.fx.play('uiClick', { gain: 0.7 });
      },
      { capture: true, passive: true },
    );
  }

  /** A sound at a point of the world, heard from the player. */
  at(id: FxId, x: number, y: number, px: number, py: number, gain = 1, range?: number): void {
    const place = spatial(x - px, y - py, range);
    if (place) this.fx.play(id, { gain: gain * place.gain, pan: place.pan });
  }

  /** The player's attack starts: the sound of its weapon. */
  swing(strike: AttackGear, heavy: boolean): void {
    if (strike.ranged) this.fx.play('bowShot', { gain: 0.8 });
    else if (strike.kind === 'cantrip') this.fx.play('cantrip', { gain: 0.8 });
    else if (strike.kind === 'unarmed' || strike.kind === 'martial-arts') this.fx.play('swingLight', { gain: 0.8 });
    else this.fx.play(heavy ? 'swingHeavy' : 'swing', { gain: 0.8 });
  }

  /** A blow of the player lands on a mob (or misses it). */
  blow(mob: MobSound, damage: number, crit: boolean, px: number, py: number): void {
    if (damage === 0) return;
    const id: FxId = crit ? 'crit' : ARMOURED.has(mob.kind) ? 'hitArmor' : 'hitFlesh';
    this.at(id, mob.x, mob.y, px, py, 1, 20 * TILE);
  }

  /** The player is hit, a blow glances off it, it dodges, it falls. */
  hurt(): void {
    this.fx.play('hurt');
  }
  glance(): void {
    this.fx.play('glance', { gain: 0.8 });
  }
  dodge(): void {
    this.fx.play('dodge', { gain: 0.8 });
  }
  down(): void {
    this.fx.play('down');
  }

  /** The mobs of this frame: their voices and their swings. */
  mobsNow(list: readonly MobSound[], px: number, py: number, now: number): void {
    const seen = new Set<number>();
    this.voicesAt = this.voicesAt.filter((t) => now - t < 600);
    for (const mob of list) {
      seen.add(mob.id);
      let memory = this.mobs.get(mob.id);
      if (!memory) {
        memory = { state: mob.state, voiceAt: -Infinity, alertAt: -Infinity };
        this.mobs.set(mob.id, memory);
        // A mob that comes into the world hunting has spotted the player.
        if (mob.state !== 'chase') continue;
        memory.state = 'idle';
      }
      const before = memory.state;
      memory.state = mob.state;
      if (before === mob.state || !(MOB_KINDS as readonly string[]).includes(mob.kind)) continue;
      if (mob.state === 'strike') this.at(HEAVY.has(mob.kind) ? 'swingHeavy' : 'swing', mob.x, mob.y, px, py, 0.55);
      if (mob.state === 'dying') this.at('mobFall', mob.x, mob.y, px, py, 0.9);
      const event = voiceOfChange(before, mob.state);
      if (!event) continue;
      // An alert once in a while; any voice not too often; at most three voices at once.
      if (event === 'alert' && now - memory.alertAt < ALERT_MS) continue;
      if (event !== 'death' && now - memory.voiceAt < VOICE_GAP_MS) continue;
      if (this.voicesAt.length >= 3 && event !== 'death') continue;
      const place = spatial(mob.x - px, mob.y - py, VOICE_RANGE);
      if (!place) continue;
      memory.voiceAt = now;
      if (event === 'alert') memory.alertAt = now;
      this.voicesAt.push(now);
      this.fx.voice(mobVoice(mob.kind, event), { gain: place.gain, pan: place.pan, delay: event === 'death' ? 0.05 : 0 });
    }
    for (const id of this.mobs.keys()) if (!seen.has(id)) this.mobs.delete(id);
  }

  /** The arrows and fire bolts of the mobs in this frame: each one is shot, and lands. */
  arrowsNow(list: readonly ArrowSound[], px: number, py: number): void {
    const next = new Map(list.map((a) => [a.id, a]));
    for (const a of list) if (!this.arrows.has(a.id)) this.at(a.fire ? 'fireBolt' : 'bowShot', a.x, a.y, px, py, 0.7);
    for (const [id, a] of this.arrows) if (!next.has(id)) this.at(a.fire ? 'fireHit' : 'arrowHit', a.x, a.y, px, py, 0.8);
    this.arrows = next;
  }

  /** The player's steps: one every STRIDE pixels, on the ground under it; softer when it sneaks. */
  steps(world: World, x: number, y: number, sneaking: boolean): void {
    const last = this.last;
    this.last = { x, y };
    if (!last) return;
    const moved = Math.hypot(x - last.x, y - last.y);
    // A jump (a wake at home, a door to elsewhere) is not a walk.
    if (moved > TILE * 2) return;
    this.walked += moved;
    if (this.walked < STRIDE) return;
    this.walked %= STRIDE;
    const id = stepOf(world.ground(Math.floor(x / TILE), Math.floor(y / TILE)));
    if (id) this.fx.play(id, { gain: sneaking ? 0.3 : 0.75, pan: (Math.random() - 0.5) * 0.15 });
  }

  /** Quiet: no ambience and no layer (the prologue plays over the game, with its own). Then the next `place` starts them again. */
  silence(): void {
    this.ambience = null;
    this.ambienceWhere = null;
    for (const layer of ['water', 'fire', 'fountain', 'forge'] as const) audio.setLayer(layer, 0);
    this.nextLayers = Infinity;
  }

  /** After a silence: the place's sounds come back at the next `place`. */
  resume(): void {
    this.ambience = null;
    this.ambienceWhere = null;
    this.nextLayers = 0;
    audio.setAmbience(null);
  }

  /**
   * The ambience of the place at its hour, and the sounds of the things near the player (a few times a
   * second). When only the hour changes, the two ambiences crossfade slowly (HOUR_AMBIENCE_FADE).
   */
  place(world: World, mood: Mood, indoors: boolean, night: boolean, x: number, y: number, now: number): void {
    const ambience = ambienceOf(mood, indoors, night);
    if (this.nextLayers === Infinity) return;
    if (ambience !== this.ambience) {
      const where = `${mood}:${indoors}`;
      const hourOnly = this.ambience !== null && where === this.ambienceWhere;
      this.ambience = ambience;
      this.ambienceWhere = where;
      audio.setAmbience(ambience, hourOnly ? HOUR_AMBIENCE_FADE : PLACE_AMBIENCE_FADE);
    }
    if (now < this.nextLayers) return;
    this.nextLayers = now + 300;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const nearest = new Map<LayerId, { d: number; dx: number }>();
    const consider = (layer: LayerId, cx: number, cy: number) => {
      const d = Math.hypot(cx - (tx + 0.5), cy - (ty + 0.5));
      const best = nearest.get(layer);
      if (d <= LAYER_RANGE[layer] && (!best || d < best.d)) nearest.set(layer, { d, dx: cx - (tx + 0.5) });
    };
    // The water: the nearest water within its range.
    const reach = LAYER_RANGE.water;
    for (let yy = ty - reach; yy <= ty + reach; yy++) {
      for (let xx = tx - reach; xx <= tx + reach; xx++) {
        const g = world.ground(xx, yy);
        if (g === Ground.Water || g === Ground.Shallows) consider('water', xx + 0.5, yy + 0.5);
      }
    }
    const far = Math.max(...Object.values(LAYER_RANGE));
    for (const f of world.fixturesIn(tx - far, ty - far, tx + far, ty + far)) {
      const layer = LAYER_OF[f.kind];
      if (layer) consider(layer, f.tx + 0.5, f.ty + 0.5);
    }
    for (const layer of ['water', 'fire', 'fountain', 'forge'] as const) {
      const found = nearest.get(layer);
      if (!found) {
        audio.setLayer(layer, 0);
        continue;
      }
      // Louder as it comes near; through a wall, much less.
      const level = (1 - found.d / LAYER_RANGE[layer]) ** 1.5 * (indoors ? 0.35 : 1);
      audio.setLayer(layer, level, found.dx / 6);
    }
  }
}
