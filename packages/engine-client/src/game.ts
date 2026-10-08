import './style.css';
import { Application, Container, GlProgram, TextureSource } from 'pixi.js';
import {
  ATTACK_REACH,
  ATTACK_TICKS,
  Horde,
  MOB_STATS,
  NpcCrowd,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  npcActors,
  npcFixture,
  attackHits,
  canAttack,
  clampInput,
  createPlayer,
  facingFor,
  findInteraction,
  stepPlayer,
  useDoor,
  type Facing,
  type Fixture,
  type Interaction,
  type InteractionTarget,
  type MoveInput,
  type WorldDefinition,
} from '@game/engine';
import { loadArt } from './assets.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard } from './input/keyboard.ts';
import { FixedStep } from './loop.ts';
import { Buildings } from './render/buildings.ts';
import { Camera } from './render/camera.ts';
import { CRT_TEXT, CrtFilter } from './render/crt.ts';
import { Fixtures } from './render/fixtures.ts';
import { NetSession } from './net/session.ts';
import { Lighting, TORCH } from './render/lighting.ts';
import { BarkBubbles } from './render/barks.ts';
import { INTRO_TIMING, IntroTitle } from './render/intro.ts';
import { WelcomeSpeech } from './render/welcome.ts';
import { MobViews, type MobLook } from './render/mobs.ts';
import { NameTag } from './render/name-tag.ts';
import { NpcViews } from './render/npcs.ts';
import { OtherPlayers } from './render/others.ts';
import { PixelFont } from './render/pixel-text.ts';
import { PlayerView, atlasPlayerTextures, type PlayerTextures } from './render/player-view.ts';
import { SpeechBubble } from './render/speech-bubble.ts';
import { Terrain } from './render/terrain.ts';
import { skinFromSeed, skinName } from '../art/skins.ts';
import { newSkinSeed, saveName, savedName, skinSeed } from './skins/seed.ts';
import { SkinStore, attackLook } from './skins/skin-store.ts';
import { ActionButton, type PressSource } from './ui/action-button.ts';
import { AttackButton } from './ui/attack-button.ts';
import { Hud, showFatal } from './ui/hud.ts';
import { LinkCard } from './ui/link-card.ts';
import { PresenceLabel } from './ui/presence.ts';
import { YouSection } from './ui/you-section.ts';
import { SettingsPanel, crtStateFrom, loadSavedCrt } from './ui/settings-panel.ts';
import { STRINGS } from './ui/strings.ts';
import { WorldMenu } from './ui/world-menu.ts';

/**
 * The git commit of the build, for the debug panel. The application's Vite config defines it
 * (see apps/game/vite.config.ts); the declaration is here so that every program that imports the
 * engine sees it.
 */
declare const __COMMIT__: string;

export interface GameOptions {
  /** The worlds of the application. The world menu lists them; ?world=<id> picks one. */
  readonly worlds: readonly WorldDefinition[];
  /** The world when the URL names none. Default: the first. */
  readonly defaultWorld?: string;
  /** The page title: "<world name> · <title>". */
  readonly title?: string;
}

/** An attack asked for this recently (ms) still starts when the player becomes able to attack. */
const ATTACK_BUFFER_MS = 150;
/** The attack turns to a mob this much beyond the reach of the attack (world pixels). */
const AIM_SLACK = 10;
/** A hit shakes the camera for this long (ms), by about this much (world pixels). */
const SHAKE = { ms: 220, amount: 2 } as const;
/** In a shared world a blow kills at once on the screen; if the server has not agreed this long after (ms), the mob lives on. */
const PREDICTED_KILL_MS = 700;
/** The client predicts a kill only this far inside the reach (world pixels): the server's check has a little more. */
const PREDICT_MARGIN = 3;

/** A key for "the same target": a fixture by its anchor, anything else by its tile. */
function targetKey(target: InteractionTarget): string {
  const f = target.fixture;
  return f ? `${f.kind}@${f.tx},${f.ty}` : `${target.kind}@${target.tx},${target.ty}`;
}

async function run(options: GameOptions): Promise<void> {
  const params = new URLSearchParams(location.search);
  const definition = options.worlds.find((w) => w.id === params.get('world')) ?? options.worlds.find((w) => w.id === options.defaultWorld) ?? options.worlds[0];
  if (!definition) throw new Error('startGame: no worlds');
  if (options.title) document.title = `${definition.name} · ${options.title}`;
  const seed = Number.parseInt(params.get('seed') ?? '', 10);

  // Pixel art: no smoothing on any texture, and sprites on whole pixels.
  TextureSource.defaultOptions.scaleMode = 'nearest';
  // High precision in every fragment shader. Pixi asks for mediump, and many Android GPUs (Mali,
  // some Adreno) compute it with 16-bit floats: a texture coordinate near the bottom of the
  // atlas (about 3000 px tall) is then off by up to 0.7 texel, so a tile reads the empty gap
  // next to it, and black lines show across the ground and the text. Pixi falls back on its own
  // where a GPU has no highp for fragments.
  GlProgram.defaultOptions.preferredFragmentPrecision = 'highp';
  const app = new Application();
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: false,
    roundPixels: true,
    background: '#08090b',
    // The CRT filter has a WebGL shader only.
    preference: 'webgl',
  });
  document.getElementById('game')!.appendChild(app.canvas);

  const art = await loadArt();
  const world = new World(definition.createSource(Number.isFinite(seed) ? seed : null));
  // ?at=tx,ty starts on (or next to) that tile, for tests and for a look at one place.
  const at = (params.get('at') ?? '').split(',').map((v) => Number.parseInt(v, 10));
  const spawn = at.length === 2 && at.every(Number.isFinite) ? world.findSpawn(at[0], at[1], 0) : world.spawn();
  const player = createPlayer(spawn.x, spawn.y);
  const previous = { x: player.x, y: player.y };
  // The interpolated position of the player in this frame: speech over the player follows it.
  const shown = { x: player.x, y: player.y };
  // Each visitor has a skin: a random seed that the browser keeps, so it stays the same across
  // visits. ?skin=<n> shows another one. The others see the same skin in a shared world.
  let skin = skinSeed(params);
  // The visitor's name: the others see it over the player's head (in a shared world).
  let name = savedName();
  // A shared world goes through the multiplayer server; ?offline plays it alone.
  const net = definition.multiplayer && !params.has('offline') ? new NetSession(definition.id, skin, name, player, world) : null;
  // What is left to hide of a correction from the server, in world pixels.
  const smoothing = { x: 0, y: 0 };

  // Two layers, each with its own CRT filter: the world, and the text in the world on top.
  // The world, from the bottom: the ground chunks; walls, fixtures, trees and players sorted by
  // depth; the faint copies of the players that show through trees; the darkness and its lights.
  // The camera moves `scene` and `textScene` together.
  const worldLayer = new Container();
  const textLayer = new Container();
  const scene = new Container();
  const textScene = new Container();
  const groundLayer = new Container();
  const entityLayer = new Container({ sortableChildren: true });
  // The faint copies of the players that show through trees: above the props, below the darkness.
  const ghostLayer = new Container();
  // What glows above the darkness: the eyes of mobs, embers, the stars of a stun.
  const glowLayer = new Container();
  scene.addChild(groundLayer, entityLayer, ghostLayer);
  worldLayer.addChild(scene);
  textLayer.addChild(textScene);
  app.stage.addChild(worldLayer, textLayer);

  const font = new PixelFont(art);
  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const buildings = new Buildings(world, art, entityLayer, textScene, font);
  // The names over heads: above the signs, below every speech bubble (added later).
  const tagLayer = new Container();
  textScene.addChild(tagLayer);
  const fixtures = new Fixtures(world, art, entityLayer);
  // The skins: rendered in a worker, kept in localStorage. The visitor's own goes first; until
  // it is ready (a moment on the first visit), the player is a darker wanderer.
  const skins = new SkinStore();
  /** Wears skin `seed` when it is ready (at once if it is), unless another one was asked for since. */
  const wear = (seed: number, then: () => void = () => {}) => {
    // How it attacks follows the skin at once; the frames come when the skin is ready.
    const look = attackLook(seed);
    playerView.setAttackStyle(look.style, look.tint);
    // Without a name of its own, the visitor is called by its look.
    you.setLookName(skinName(seed));
    const apply = (textures: PlayerTextures) => {
      if (seed !== skin) return;
      playerView.setTextures(textures);
      playerView.setPending(false);
      you.showLook(skins.sheet(seed), skinFromSeed(seed).vibe);
      then();
    };
    const ready = skins.get(seed, apply, true);
    if (ready) apply(ready);
  };
  const playerView = new PlayerView(art, atlasPlayerTextures(art), true);
  // ?attackpose=<tick>,<facing> shows the player frozen at that tick of an attack, facing that
  // way: a screenshot of an attack on a slow machine.
  const [poseTick, poseFacing] = (params.get('attackpose') ?? '').split(',');
  const attackPose = Number.isFinite(Number.parseInt(poseTick ?? '', 10))
    ? { attack: ATTACK_TICKS - Number.parseInt(poseTick!, 10), facing: (['down', 'up', 'left', 'right'].includes(poseFacing ?? '') ? poseFacing : 'down') as Facing }
    : null;
  entityLayer.addChild(playerView.root);
  ghostLayer.addChild(playerView.ghost);
  glowLayer.addChild(playerView.overlay);
  // The settings panel's "You" section: a new random look (saved for the next visits; the others
  // see it), and the name.
  const you = new YouSection(name, {
    onNewLook: () => {
      skin = newSkinSeed();
      you.setBusy(true);
      const seed = skin;
      wear(seed, () => {
        you.setBusy(false);
        net?.setSkin(seed);
      });
    },
    onName: (raw) => {
      name = saveName(raw);
      you.setName(name);
      net?.setName(name);
    },
  });
  wear(skin);
  const others = net ? new OtherPlayers(art, skins, entityLayer, ghostLayer, tagLayer, glowLayer, new PixelFont(art, 'small')) : null;
  // Walking NPCs: the server runs them in a shared world; this crowd runs them while the client
  // is alone (a single-player world, or no server). Its seed differs per page: nobody else sees it.
  const npcDefs = world.source.npcs?.() ?? [];
  const localNpcs = npcDefs.length > 0 ? new NpcCrowd(world, npcDefs, Math.floor(Math.random() * 0xffffffff)) : null;
  const npcViews = npcDefs.length > 0 ? new NpcViews(art, npcDefs, entityLayer, ghostLayer) : null;
  const npcIndex = new Map(npcDefs.map((def, i) => [npcFixture(def), i]));
  const npcPoses = (now: number) => (net?.serverNpcs ? net.npcsAt(now) : (localNpcs?.poses ?? []));
  // The lines that NPCs say by themselves, over their heads; never over a dialog with them.
  const barkBubbles = npcDefs.length > 0 ? new BarkBubbles(art, font, textScene) : null;
  let linesHeard = 0;
  let linesShown = 0;
  let lastLine = '-';
  const tileOf = (p: { x: number; y: number }) => [Math.floor(p.x / TILE_SIZE), Math.floor(p.y / TILE_SIZE)] as const;
  const sayLines = (lines: readonly (readonly [number, number])[]) => {
    const now = performance.now();
    const poses = npcPoses(now);
    const here = world.insideOf(...tileOf(player));
    for (const [index, line] of lines) {
      const def = npcDefs[index];
      const text = def?.barks?.[line];
      if (!def || !text) continue;
      linesHeard++;
      lastLine = `${def.id}: ${text}`;
      // The visitor sees what it hears: an NPC outside, or in the same house. A keeper under a
      // roof does not put a bubble over it. And no line over a dialog with that NPC.
      const pose = poses[index];
      const there = pose ? world.insideOf(...tileOf(pose)) : null;
      if (there !== null && there !== here) continue;
      // Nobody talks over the arrival: the title and the host's welcome.
      if (arriving(now)) continue;
      if (dialogKey === targetKey({ kind: 'npc', tx: def.home[0], ty: def.home[1], distance: 0, fixture: npcFixture(def) })) continue;
      barkBubbles?.say(index, text, () => npcViews!.headOf(index), now);
      linesShown++;
    }
  };
  net?.onBarks(sayLines);

  // Mobs: in a world with mob rules. A single-player world runs its own horde (its seed differs
  // per page); a shared world gets them from the server.
  // ?nomobs: none (for tests that walk about, and for a quiet look).
  const mobRules = params.has('nomobs') ? null : (world.source.mobs?.() ?? null);
  const horde = mobRules && !net ? new Horde(world, mobRules, Math.floor(Math.random() * 0xffffffff)) : null;
  const mobViews = mobRules ? new MobViews(art, entityLayer, glowLayer) : null;
  // ?mob=imp,brute puts those mobs near the player at the start, one tile apart, 5 tiles to the
  // east (for tests and for a look at them). Single-player worlds only.
  (params.get('mob') ?? '').split(',').forEach((kind, i) => {
    if (horde && (kind === 'imp' || kind === 'brute')) {
      const spot = world.findSpawn(Math.floor(player.x / TILE_SIZE) + 5, Math.floor(player.y / TILE_SIZE) + i * 2 - 1, 0);
      horde.spawn(kind, spot.x, spot.y);
    }
  });
  let kills = 0;
  let confirmed = 0;
  let hitsTaken = 0;
  let stunSeen = false;
  let shakeUntil = -Infinity;
  // In a shared world, a blow that hits a mob on the screen shows at once: its last blow kills
  // it there, another one makes it reel. The server decides, and its word comes a moment later.
  // Mob id -> when, and where the mob was (a kill), or when (a reel).
  const predicted = new Map<number, { at: number; x: number; y: number; confirmed: boolean }>();
  const reeling = new Map<number, { at: number; seen: boolean }>();
  const predictKills = (): void => {
    const now = performance.now();
    for (const mob of net?.mobsAt(now) ?? []) {
      if (mob.state === 'dying' || predicted.has(mob.id)) continue;
      // Only a clear hit: a blow at the edge of the reach waits for the server's word.
      if (!attackHits(player.x, player.y, player.facing, mob.x, mob.y, MOB_STATS[mob.kind].radius - PREDICT_MARGIN)) continue;
      if (mob.health > 1) {
        reeling.set(mob.id, { at: now, seen: false });
        continue;
      }
      predicted.set(mob.id, { at: now, x: mob.x, y: mob.y, confirmed: false });
      kills++;
    }
  };
  /** The mobs to draw and to aim at now: the local horde's, or the server's with the kills that this client predicts. */
  const mobsNow = (): readonly MobLook[] => {
    if (!net) return horde?.mobs ?? [];
    const now = performance.now();
    const list = net.mobsAt(now);
    const out: MobLook[] = [];
    const present = new Set<number>();
    for (const mob of list) {
      present.add(mob.id);
      const reel = reeling.get(mob.id);
      if (reel && mob.state !== 'dying') {
        // A predicted reel shows at once with the local timing, until the server's reel is over
        // (or, if the server does not agree, for at most PREDICTED_KILL_MS).
        if (mob.state === 'hurt') reel.seen = true;
        if (mob.state === 'hurt' || (!reel.seen && now - reel.at < PREDICTED_KILL_MS)) {
          out.push({ ...mob, state: 'hurt', stateMs: Math.max(mob.state === 'hurt' ? mob.stateMs : 0, now - reel.at) });
          continue;
        }
        reeling.delete(mob.id);
      }
      const guess = predicted.get(mob.id);
      if (!guess) out.push(mob);
      else if (mob.state === 'dying') {
        // The server agrees. The death keeps the local timing, so it does not start again.
        if (!guess.confirmed) confirmed++;
        guess.confirmed = true;
        out.push({ ...mob, stateMs: now - guess.at });
      } else if (now - guess.at > PREDICTED_KILL_MS) {
        predicted.delete(mob.id);
        out.push(mob);
      } else {
        out.push({ ...mob, x: guess.x, y: guess.y, vx: 0, vy: 0, state: 'dying', stateMs: now - guess.at });
      }
    }
    for (const id of predicted.keys()) if (!present.has(id)) predicted.delete(id);
    for (const id of reeling.keys()) if (!present.has(id)) reeling.delete(id);
    return out;
  };
  // An attack: the button (or Space) asks for it, and the next tick in which the player can
  // attack starts it, towards the nearest mob in reach, else the way the player walks or faces.
  const attackButton = mobRules ? new AttackButton() : null;
  let attackAskedAt = -Infinity;
  attackButton?.onPress(() => {
    attackAskedAt = performance.now();
  });
  const aim = (move: MoveInput): Facing => {
    let best: MobLook | null = null;
    let bestD = Infinity;
    for (const mob of mobsNow()) {
      if (mob.state === 'dying') continue;
      const d = Math.hypot(mob.x - player.x, mob.y - player.y);
      if (d < bestD && d <= ATTACK_REACH + MOB_STATS[mob.kind].radius + AIM_SLACK) {
        best = mob;
        bestD = d;
      }
    }
    if (best) {
      const dx = best.x - player.x;
      const dy = best.y - player.y;
      return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    }
    return facingFor(player.facing, move);
  };

  if (net) new PresenceLabel(net);
  // ?nolight shows the world without the darkness, to look at the art.
  const lighting = params.has('nolight') ? null : new Lighting(art, app.renderer, definition.darkness);
  if (lighting) scene.addChild(lighting.root);
  scene.addChild(glowLayer);
  // Text in the world is above the darkness, so it is readable at night.
  const speech = new SpeechBubble(art, font, { name: 'dialog' });
  textScene.addChild(speech.root);
  // The visitor's own name over its head: the one it chose, or else the name of its look. It
  // hides while the player speaks (a bubble over its head).
  const ownTag = new NameTag(new PixelFont(art, 'small'), tagLayer);
  let speaking = false;
  const displayName = () => name || skinName(skin);

  // The arrival: the name of the world in the middle of the screen; as it fades out, the host
  // NPC starts its welcome. ?nointro skips both (for tests and for a quick look).
  const intro = definition.intro && !params.has('nointro') ? definition.intro : null;
  const introTitle = intro ? new IntroTitle(font, intro.title) : null;
  if (introTitle) textScene.addChild(introTitle.root);
  const hostIndex = intro?.speaker ? npcDefs.findIndex((def) => def.id === intro.speaker) : -1;
  const welcome = intro?.welcome?.length ? new WelcomeSpeech(art, font, textScene) : null;
  /** The welcome starts in the middle of the title's fade-out. */
  const WELCOME_AT = INTRO_TIMING.fadeIn + INTRO_TIMING.hold + INTRO_TIMING.fadeOut / 2;
  let arrivedAt: number | null = null;
  let welcomed = false;
  // ?introat=<ms> stops the title's clock at that moment after the arrival (the welcome then
  // starts at once if that moment is past its start): a screenshot of the title on a slow machine.
  const frozenAt = Number.parseFloat(params.get('introat') ?? '');
  const introClock = (now: number) => (Number.isFinite(frozenAt) && arrivedAt !== null ? arrivedAt + frozenAt : now);
  /** Whether the arrival is under way: the title, the wait for the welcome, or the welcome. */
  const arriving = (now: number) => intro !== null && (introTitle!.phase(introClock(now)) !== 'done' || (welcome !== null && (!welcomed || welcome.active)));
  // CRT diffusion. The world filter covers the whole screen; the display settings panel turns
  // it on and off and changes it, and ?nocrt and ?crt=spread,mix,glow,scanline set it from the
  // URL. The text filter has its own fixed settings and covers only the text (its bounds plus
  // padding), so it costs little; the panel's switch turns it on and off too.
  const crt = new CrtFilter();
  worldLayer.filters = [crt];
  worldLayer.filterArea = app.screen;
  const crtText = new CrtFilter(CRT_TEXT, 8);
  textLayer.filters = [crtText];
  const settings = new SettingsPanel(crt, crtStateFrom(params, loadSavedCrt()), [crtText]);
  settings.addSection(you.element);
  new WorldMenu(options.worlds, definition);

  const keyboard = new Keyboard(window);
  const joystick = new TouchJoystick(
    document.getElementById('game')!,
    document.getElementById('stick')!,
    document.getElementById('stick-knob')!,
  );
  const readInput = () => {
    const keys = keyboard.vector();
    const stick = joystick.vector();
    return clampInput({ x: keys.x + stick.x, y: keys.y + stick.y });
  };

  const hud = new Hud(params.has('debug'));
  hud.showHint(mobRules ? STRINGS.hintKeyboardFight : STRINGS.hintKeyboard);
  joystick.onTouchMode(() => hud.showHint(STRINGS.hintTouch));

  // ---------------------------------------------------------------- actions
  //
  // The action button (or E) acts on the thing that the player is very close to. A door opens
  // or closes. Anything else shows its content: pages of text over whoever speaks (the player
  // for a thing, the NPC for an NPC), one page per press, and a link card if it has a link.
  // The dialog belongs to its target: walking away closes it.
  const contentOf = (t: InteractionTarget): Interaction | null => {
    if (t.fixture?.content) return t.fixture.content;
    const line = definition.examine[t.kind];
    return line ? { pages: [line] } : null;
  };
  const accept = (kind: InteractionTarget['kind'], fixture: Fixture | null) => Boolean(fixture?.content ?? definition.examine[kind]);
  const action = new ActionButton();
  const linkCard = new LinkCard();
  let target: InteractionTarget | null = null;
  let dialogKey: string | null = null;

  const closeDialog = (now: number) => {
    speech.hide(now);
    linkCard.hide();
    dialogKey = null;
  };

  action.onPress((source: PressSource) => {
    if (!target) return;
    const now = performance.now();
    if (target.kind === 'door') {
      // A door never closes on anyone: the other players, or an NPC in the doorway.
      const people = [...(net?.playersAt(now) ?? []), ...npcPoses(now)];
      const result = net ? net.door(target.tx, target.ty, people) : useDoor(world, player, target.tx, target.ty, people);
      if (result === 'blocked') {
        // Who is in the way: the player itself, or someone else (another visitor, an NPC).
        const self = Math.abs(player.x - (target.tx * TILE_SIZE + TILE_SIZE / 2)) < TILE_SIZE / 2 + 5 && player.y + 3 > target.ty * TILE_SIZE && player.y - 3 < (target.ty + 1) * TILE_SIZE;
        speech.show([self ? STRINGS.doorBlocked : STRINGS.doorBlockedByOther], () => ({ x: shown.x, y: shown.y - playerView.headHeight }), now);
        speaking = true;
      }
      buildings.refreshDoor(target.tx, target.ty);
      return;
    }
    const content = contentOf(target);
    if (!content) return;
    const key = targetKey(target);
    if (key === dialogKey) {
      if (speech.showing && speech.hasMore) {
        speech.next(now);
        return;
      }
      if (content.link && linkCard.visible) {
        // A key press may open a tab; a touch may not, so point at the card's link instead.
        if (source === 'key') linkCard.open();
        else linkCard.pulse();
        return;
      }
      closeDialog(now);
      return;
    }
    dialogKey = key;
    const fixture = target.fixture;
    // A dialog with an NPC stops the line that it was saying, and its welcome.
    const talking = fixture ? npcIndex.get(fixture) : undefined;
    if (talking !== undefined) barkBubbles?.hush(talking, now);
    if (talking !== undefined && talking === hostIndex) welcome?.stop(now);
    const walker = fixture ? npcIndex.get(fixture) : undefined;
    const anchor =
      content.speaker === 'fixture' && fixture
        ? walker !== undefined
          ? () => npcViews!.headOf(walker)
          : () => Fixtures.headOf(fixture)
        : () => ({ x: shown.x, y: shown.y - playerView.headHeight });
    speech.show(content.pages ?? [], anchor, now);
    speaking = !(content.speaker === 'fixture' && fixture);
    if (content.link) linkCard.show(content.link);
    else linkCard.hide();
  });

  const actionLabel = (t: InteractionTarget): string => {
    if (t.kind === 'door') return world.isDoorOpen(t.tx, t.ty) ? STRINGS.closeDoor : STRINGS.openDoor;
    const content = contentOf(t);
    if (targetKey(t) === dialogKey) {
      if (speech.showing && speech.hasMore) return STRINGS.next;
      if (content?.link && linkCard.visible) return content.link.label;
      return STRINGS.close;
    }
    if (t.kind === 'npc') return STRINGS.talk;
    if (t.kind === 'portal') return STRINGS.lookIntoPortal;
    return STRINGS.examine(STRINGS.names[t.kind]);
  };

  // ---------------------------------------------------------------- loop

  const camera = new Camera();
  const resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    app.renderer.resize(window.innerWidth, window.innerHeight, dpr);
    camera.resize(window.innerWidth, window.innerHeight, dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  const sim = new FixedStep(TICK_SECONDS, () => {
    previous.x = player.x;
    previous.y = player.y;
    let input: MoveInput = readInput();
    if (performance.now() - attackAskedAt < ATTACK_BUFFER_MS && canAttack(player)) {
      input = { ...input, attack: aim(input) };
      attackAskedAt = -Infinity;
    }
    if (net) {
      if (net.tick(input)) predictKills();
    } else if (stepPlayer(player, input, world) && horde) {
      kills += horde.strike(player, player.facing, undefined, 0).filter((mob) => mob.state === 'dying').length;
    }
    if (localNpcs && !net?.serverNpcs) sayLines(localNpcs.step(TICK_SECONDS * 1000, [player]).barks);
    horde?.step(TICK_SECONDS * 1000, [{ id: 0, state: player }]);
  });

  // Make all the chunks on the screen before the first frame, so the world never appears in pieces.
  camera.follow(scene, player.x, player.y);
  terrain.update(camera.view(), Infinity);
  buildings.update(camera.view(), null, 0);
  fixtures.update(camera.view(), 0);

  let hintShown = true;
  let nextRetainAt = 0;
  app.ticker.add((ticker) => {
    const seconds = ticker.deltaMS / 1000;
    const now = performance.now();
    sim.advance(seconds);
    if (net) {
      // A correction from the server moves the player: move the interpolation with it, and show
      // a small one gradually instead of as a jump.
      const jump = net.takeJump();
      previous.x += jump.x;
      previous.y += jump.y;
      if (jump.smooth) {
        smoothing.x -= jump.x;
        smoothing.y -= jump.y;
      }
      const keep = Math.exp(-seconds * 12);
      smoothing.x *= keep;
      smoothing.y *= keep;
      if (Math.hypot(smoothing.x, smoothing.y) < 0.05) smoothing.x = smoothing.y = 0;
    }
    shown.x = previous.x + (player.x - previous.x) * sim.alpha + smoothing.x;
    shown.y = previous.y + (player.y - previous.y) * sim.alpha + smoothing.y;
    playerView.update(shown.x, shown.y, attackPose ? { ...player, ...attackPose, vx: 0, vy: 0 } : player, seconds);
    // A hit (a stun starts: from the local horde, or in a snapshot) shakes the view a little.
    if (player.stun > 0 && !stunSeen) {
      hitsTaken++;
      shakeUntil = now + SHAKE.ms;
    }
    stunSeen = player.stun > 0;
    const shake = now < shakeUntil ? SHAKE.amount * ((shakeUntil - now) / SHAKE.ms) : 0;
    camera.follow(scene, shown.x + Math.round((Math.random() - 0.5) * 2 * shake), shown.y + Math.round((Math.random() - 0.5) * 2 * shake));
    mobViews?.update(mobsNow(), now, seconds);
    attackButton?.setReady(player.stun === 0);
    textScene.position.copyFrom(scene.position);
    textScene.scale.copyFrom(scene.scale);

    const npcsNow = npcPoses(now);
    npcViews?.update(npcsNow, seconds);
    target = findInteraction(world, player, accept, npcActors(npcDefs, npcsNow));
    if (dialogKey && (!target || targetKey(target) !== dialogKey)) closeDialog(now);
    action.setTarget(target ? actionLabel(target) : null);

    const view = camera.view();
    const inside = world.insideOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE));
    buildings.update(view, inside, seconds);
    fixtures.update(view, now / 1000);
    others?.update(net!.playersAt(now), seconds, view);
    // Free the skins that nobody here wears any more (now and then).
    if (now >= nextRetainAt) {
      nextRetainAt = now + 5000;
      skins.retain(new Set([skin, ...(others?.skinsWorn ?? [])]));
    }
    const torch = { x: shown.x, y: shown.y - 14, radius: TORCH.radius, colour: TORCH.colour, flicker: true, seed: 0 };
    const fxLight = playerView.fxLight;
    lighting?.update(view, [torch, ...(fxLight ? [fxLight] : []), ...(others?.lights() ?? []), ...fixtures.lights(), ...buildings.lights()], now / 1000);
    speech.update(now, view);
    ownTag.set(displayName());
    ownTag.place(shown.x, shown.y, playerView.headHeight, view, 1, !(speech.showing && speaking));
    barkBubbles?.update(now, view);
    if (arrivedAt === null) {
      arrivedAt = now;
      introTitle?.start(now);
    }
    const introNow = introClock(now);
    introTitle?.update(introNow, view);
    if (welcome && intro?.welcome && !welcomed && introNow - arrivedAt >= WELCOME_AT) {
      welcomed = true;
      const anchor = hostIndex >= 0 ? () => npcViews!.headOf(hostIndex) : () => ({ x: shown.x, y: shown.y - playerView.headHeight });
      welcome.start(intro.welcome, anchor, now);
    }
    welcome?.update(now, view);
    const dpr = app.renderer.resolution;
    crt.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr, dpr);
    crtText.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr, dpr);
    terrain.update(view, 1);

    if (hintShown && Math.hypot(player.x - spawn.x, player.y - spawn.y) > 3 * TILE_SIZE) {
      hintShown = false;
      hud.hideHint();
    }
    hud.debug(now, () => [
      `fps     ${ticker.FPS.toFixed(0)}`,
      `world   ${definition.id}`,
      `skin    ${skin} (${skinFromSeed(skin).vibe}), name ${displayName()}${name ? '' : ' (from the look)'}`,
      `net     ${net ? `${net.status}, ${net.others} other${net.others === 1 ? '' : 's'}${net.rttMs === null ? '' : `, rtt ${net.rttMs.toFixed(0)} ms`}` : 'single player'}`,
      `tile    ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`,
      `facing  ${player.facing}`,
      `target  ${target ? `${target.kind} at ${target.tx}, ${target.ty}` : '-'}`,
      ...(net
        ? [
            `others  ${
              net
                .playersAt(now)
                .map((o) => `skin ${o.skin} "${o.name || skinName(o.skin)}" at ${Math.floor(o.x / TILE_SIZE)},${Math.floor(o.y / TILE_SIZE)}${o.attack ? ' attacking' : ''}${o.stun ? ' stunned' : ''}`)
                .join('; ') || '-'
            }`,
          ]
        : []),
      `inside  ${inside?.id ?? '-'}`,
      `chunks  ${terrain.chunkCount} drawn, ${world.chunkCount} in memory`,
      `fixture ${fixtures.count} shown`,
      `npcs    ${npcDefs.length ? `${npcDefs.length}, ${net?.serverNpcs ? 'from the server' : 'local'}` : '-'}`,
      ...(intro ? [`intro   ${introTitle!.phase(introClock(now))}, welcome ${welcome?.progress ?? '-'}${welcomed && !welcome?.active ? ' (done)' : ''}`] : []),
      ...(mobRules
        ? [
            `mobs    ${mobsNow()
              .map((m) => `${m.kind}${m.health !== undefined && MOB_STATS[m.kind].health > 1 ? ` ${m.health}/${MOB_STATS[m.kind].health}` : ''} ${m.state} ${Math.floor(m.x / TILE_SIZE)},${Math.floor(m.y / TILE_SIZE)}`)
              .join('; ') || '-'}`,
            `fight   kills ${kills}${net ? ` (${confirmed} confirmed)` : ''}, hits ${hitsTaken}, attack ${player.attack}, stun ${player.stun}, guard ${player.guard}`,
          ]
        : []),
      `doors   ${world.openDoorList().map(([x, y]) => `${x},${y}`).join(' ') || 'all closed'}`,
      ...(npcDefs.length ? [`lines   ${linesHeard} heard, ${linesShown} shown, last ${lastLine}`] : []),
      ...(npcDefs.length ? [`walkers ${npcPoses(now).map((p, i) => `${npcDefs[i]!.id} ${Math.floor(p.x / TILE_SIZE)},${Math.floor(p.y / TILE_SIZE)}`).join('; ')}`] : []),
      `zoom    ${camera.zoom}x (dpr ${window.devicePixelRatio})`,
      `render  ${app.renderer.name}${crt.enabled ? ' + crt' : ''}`,
      `seed    ${world.seed}`,
      `build   ${__COMMIT__}`,
    ]);
  });
}

/**
 * Starts the game in the page: the world that ?world= names (or the default), with the world
 * menu, the display settings and the controls. The page must have the elements of the engine's
 * index.html (#game, #stick, #stick-knob, #hint, #debug, #fatal).
 */
export function startGame(options: GameOptions): void {
  // iOS Safari ignores user-scalable=no, so stop the pinch and double-tap zoom here.
  document.addEventListener('gesturestart', (event) => event.preventDefault());
  document.addEventListener('dblclick', (event) => event.preventDefault());
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  run(options).catch(showFatal);
}
