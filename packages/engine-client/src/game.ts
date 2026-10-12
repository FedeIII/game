import './style.css';
import { Application, Container, GlProgram, TextureSource } from 'pixi.js';
import {
  ATTACK_TICKS,
  EMPTY_PACK,
  Companions,
  PLAIN_HP,
  Horde,
  SNEAK_SPEED,
  MOB_STATS,
  NpcCrowd,
  Spoils,
  TICK_SECONDS,
  TILE_SIZE,
  NO_INPUT,
  World,
  appearanceOf,
  characterSkin,
  finalScores,
  fixtureContent,
  Escorts,
  Guards,
  Convoys,
  GUARD_IDS,
  NPC_HALF_WIDTH,
  NPC_HALF_HEIGHT,
  type Actor,
  type GuardDef,
  type GuardEvent,
  type CompanionEvent,
  npcActors,
  npcFixture,
  attackHits,
  canAttack,
  clampInput,
  createPlayer,
  facingAngle,
  resumePoint,
  findInteraction,
  stepPlayer,
  useDoor,
  facingOfAngle,
  addToPack,
  ITEM_KINDS,
  DRINKS,
  canDodge,
  canMakeDeal,
  dealPay,
  dealPrice,
  drinkFrom,
  flyArrow,
  gateView,
  makeDeal,
  seenChunks,
  GEAR_SLOTS,
  dropWorn,
  gearSlotAt,
  shownGear,
  guestGear,
  guestTraits,
  inShallows,
  isSneaking,
  newArrow,
  refugeAt,
  rest,
  sightOf,
  wakePlayer,
  wakePoint,
  lootIsEmpty,
  Piles,
  dropPoint,
  hasItems,
  moveItem,
  ownedPack,
  unwearFor,
  removeFromSlot,
  tossPoint,
  meetsGate,
  sheetTraits,
  EMPTY_BOOK,
  Ambushes,
  MOB_KINDS,
  formatDice,
  rollingDice,
  SCENE_MARGIN,
  applyEffect,
  inScene,
  canApply,
  holds,
  questChanges,
  startNode,
  type Conditions,
  type QuestBook,
  type QuestEffect,
  type SceneDef,
  type MobKind,
  type Arrow,
  type Character,
  type Gate,
  type Deal,
  type Dialog,
  type Facing,
  type Fixture,
  type Interaction,
  type InteractionTarget,
  type Loot,
  type MoveInput,
  type Gear,
  type ItemKind,
  type Pack,
  type PlayerTraits,
  type Pile,
  type WorldDefinition,
} from '@game/engine';
import { loadArt } from './assets.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard, isFormField } from './input/keyboard.ts';
import { Mouse } from './input/mouse.ts';
import { FixedStep } from './loop.ts';
import { Buildings } from './render/buildings.ts';
import { Camera } from './render/camera.ts';
import { CursorView } from './render/cursor.ts';
import { CRT_TEXT, CrtFilter } from './render/crt.ts';
import { Fixtures } from './render/fixtures.ts';
import { EdgeMarks } from './render/marks.ts';
import { NetSession } from './net/session.ts';
import { Lighting, TORCH } from './render/lighting.ts';
import { BarkBubbles } from './render/barks.ts';
import { INTRO_TIMING, IntroTitle } from './render/intro.ts';
import { WelcomeSpeech } from './render/welcome.ts';
import { ScenePlayer } from './render/scene.ts';
import { MobViews, mobHead, type MobLook } from './render/mobs.ts';
import { ArrowViews } from './render/arrows.ts';
import { DreamVeil } from './ui/dream.ts';
import { LootText } from './render/loot-text.ts';
import { FIGHT_INK, FightNumbers } from './render/fight-numbers.ts';
import { PileViews } from './render/piles.ts';
import { NameTag } from './render/name-tag.ts';
import { NpcViews } from './render/npcs.ts';
import { CompanionViews, type CompanionPose } from './render/companions.ts';
import { OtherPlayers } from './render/others.ts';
import { PixelFont } from './render/pixel-text.ts';
import { PlayerView, atlasPlayerTextures, type PlayerTextures } from './render/player-view.ts';
import { SpeechBubble } from './render/speech-bubble.ts';
import { ConversationPanel, gateTag } from './ui/conversation.ts';
import { JournalPanel, questMarks } from './ui/journal-panel.ts';
import { QuestBanner } from './render/quest-banner.ts';
import { HOMEWARD_GATE, READ_FOE_GATE, READ_OPENING_GATE, REPUTATION_GATE } from './ui/gates.ts';
import { MapPanel } from './ui/map-panel.ts';
import { Terrain } from './render/terrain.ts';
import { skinKey, skinName, type SkinLook } from '../art/skins.ts';
import { api, backToSignIn } from './menu/api.ts';
import { runMenu } from './menu/menu.ts';
import { markResume } from './menu/resume.ts';
import { languageChoice } from './ui/language-choice.ts';
import { LANG, setWorldTexts, tw } from './i18n.ts';
import { skinSeed } from './skins/seed.ts';
import { SkinStore, attackLook } from './skins/skin-store.ts';
import { ActionButton, type PressSource } from './ui/action-button.ts';
import { AttackButton } from './ui/attack-button.ts';
import { DodgeButton } from './ui/dodge-button.ts';
import { Hud, showFatal } from './ui/hud.ts';
import { LinkCard } from './ui/link-card.ts';
import { DrinkBelt } from './ui/belt.ts';
import { PackPanel } from './ui/pack-panel.ts';
import { BuildWatch } from './ui/new-build.ts';
import { Vitals } from './ui/vitals.ts';
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
  /**
   * The application has accounts (its server answers /api/ and /auth/): the menu comes first
   * (sign-in, new game, continue), and the visitor plays a character of its account. Every visitor
   * must sign in (Fede's decision, 2026-10-11): ?nomenu skips the menu (a guest with a random look,
   * for tests and screenshots) only on a page of this machine (GUEST_HOSTS).
   */
  readonly accounts?: boolean;
}

/** The hosts where ?nomenu gives a guest: development and tests. On game.azyr.io every visitor signs in. */
const GUEST_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1']);

/** An attack (or a dodge) asked for this recently (ms) still starts when the player becomes able to. */
const ATTACK_BUFFER_MS = 150;
/** The mobs whose arrows are fire bolts (render/arrows.ts): the cinder adepts of the Ashen Seekers. */
const FIRE_SHOOTERS: ReadonlySet<MobKind> = new Set(['adept']);
/** While the player sneaks on purpose (a slow walk, or the sneak walk of C), its torch has this radius (LIGHTING.radii). */
const SNEAK_TORCH = 96;
/** The attack turns to a mob this much beyond the reach of the attack (world pixels). */
const AIM_SLACK = 10;
/** A click closer than this to the player's chest (world pixels) gives no direction: the attack goes the way the player faces. */
const MOUSE_DEAD_ZONE = 3;
/** An NPC with a dialog says its first line; the conversation panel opens this long after (ms). */
const TALK_DELAY_MS = 700;
/** After an effect on a quest goes to the server, the page shows the book as it will be for at most this long (ms). */
const PENDING_QUEST_MS = 3000;
/** The conversation ends when the NPC is further than this from the player (world pixels). */
const TALK_RANGE = 40;
/** A hit shakes the camera for this long (ms), by about this much (world pixels). */
const SHAKE = { ms: 220, amount: 2 } as const;
/** A character in a world that the page runs: its place goes to the server this often (ms), if it moved. */
const PLACE_SAVE_MS = 10_000;
/** A page that plays a character asks this often (ms) if its session still lives (a sign-in elsewhere ends it). */
const SESSION_CHECK_MS = 10_000;
/** In a shared world a blow flashes the mobs that it touches at once only this far inside the reach (world pixels): the server's check has a little more. */
const TOUCH_MARGIN = 3;
/** The numbers of a fight over the player start this far over its head (world pixels): over its name. */
const PLAYER_NUMBER_RISE = 16;
/** The dice of a world that the page runs (its draughts; its horde rolls its own). */
const LOCAL_DICE = rollingDice(Math.random);
/** The page shows that it reloads for a new build this long before it does (ms). */
const RELOAD_DELAY_MS = 1200;
/** An NPC greets a player with a good name (Charisma) when it comes this close (world pixels). */
const GREET_RANGE = 2 * TILE_SIZE;

/** "a, b and c". */
function andList(parts: readonly string[]): string {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${STRINGS.and} ${parts[parts.length - 1]}`;
}

/** What the player says when it opens a chest: what it found, that it is empty, or that the pack is full. */
function chestLine(taken: Loot, full: boolean): string {
  if (lootIsEmpty(taken)) return full ? STRINGS.packFull : STRINGS.chestEmpty;
  const parts = [
    ...(taken.coins > 0 ? [STRINGS.coins(taken.coins)] : []),
    ...taken.items.map((s) => (s.count === 1 ? STRINGS.items[s.kind].a : `${s.count} ${STRINGS.items[s.kind].many}`)),
  ];
  return `${STRINGS.found(andList(parts))}${full ? ` ${STRINGS.packFull}` : ''}`;
}

/** What the player says when it opens a source of loot: a chest (picked, if it has a lock), a patch of herbs, a buried cache. */
function sourceLine(fixture: Fixture | null, taken: Loot, full: boolean): string {
  const gone = lootIsEmpty(taken) && !full;
  if (fixture?.kind === 'herbpatch') return gone ? STRINGS.herbsGone : chestLine(taken, full);
  if (fixture?.kind === 'cache') return gone ? STRINGS.cacheGone : `${STRINGS.dug} ${chestLine(taken, full)}`;
  return `${fixture?.lock ? `${STRINGS.picked} ` : ''}${chestLine(taken, full)}`;
}

/** The lines that rise over the player for a drop: "+3 coins", "+1 imp horn" (the small font draws them in capitals). */
function dropLines(taken: Loot): string[] {
  return [
    ...(taken.coins > 0 ? [`+${STRINGS.coins(taken.coins)}`] : []),
    ...taken.items.map((s) => `+${s.count} ${s.count === 1 ? STRINGS.items[s.kind].name : STRINGS.items[s.kind].many}`),
  ];
}

/** A key for "the same target": a fixture by its anchor, a pile by its id, anything else by its tile. */
/** The row of the keys of the guards that talk: no tile is on it (targetKey). */
const GUARD_KEY_ROW = -1_000_000_000;
/** A guard that talks says its lines this high over its feet (world pixels): the driver on the wagon. */
const GUARD_HEAD = 30;

function targetKey(target: InteractionTarget): string {
  const f = target.fixture;
  if (target.pile) return `pile@${target.pile.id}`;
  return f ? `${f.kind}@${f.tx},${f.ty}` : `${target.kind}@${target.tx},${target.ty}`;
}

async function run(options: GameOptions): Promise<void> {
  const params = new URLSearchParams(location.search);
  const definition = options.worlds.find((w) => w.id === params.get('world')) ?? options.worlds.find((w) => w.id === options.defaultWorld) ?? options.worlds[0];
  if (!definition) throw new Error('startGame: no worlds');
  // The language of the page (i18n.ts): the world's texts in it, and the page says it.
  setWorldTexts(definition.texts?.[LANG]);
  document.documentElement.lang = LANG;
  if (options.title) document.title = `${tw(definition.name)} · ${options.title}`;
  const seed = Number.parseInt(params.get('seed') ?? '', 10);

  // Pixel art: no smoothing on any texture, and sprites on whole pixels.
  TextureSource.defaultOptions.scaleMode = 'nearest';
  // The atlas loads while the visitor is in the menu.
  const artLoading = loadArt();
  artLoading.catch(() => {});
  // The skins: rendered in a worker, kept in localStorage. The menu draws the looks with it, so
  // the chosen look is ready when the game starts.
  const skins = new SkinStore();
  let character: Character | null = null;
  // An admin (its email is in the server's ADMIN_EMAILS) sees the display settings; a guest never.
  let admin = false;
  const guest = params.has('nomenu') && GUEST_HOSTS.has(location.hostname);
  if (options.accounts && !guest) {
    ({ character, admin } = await runMenu({ title: tw(definition.name), site: options.title ?? location.host, skins }));
  }

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

  const art = await artLoading;
  const world = new World(definition.createSource(Number.isFinite(seed) ? seed : null));
  // ?at=tx,ty starts on (or next to) that tile, for tests and for a look at one place. Else a
  // character starts where it was last in this world, and a new one at the world's spawn.
  const at = (params.get('at') ?? '').split(',').map((v) => Number.parseInt(v, 10));
  const place = character?.place?.world === definition.id ? character.place : null;
  const spawn = at.length === 2 && at.every(Number.isFinite) ? world.findSpawn(at[0], at[1], 0) : place ? resumePoint(world, place.x, place.y) : world.spawn();
  const player = createPlayer(spawn.x, spawn.y);
  const previous = { x: player.x, y: player.y };
  // The interpolated position of the player in this frame: speech over the player follows it.
  const shown = { x: player.x, y: player.y };
  // The look and the name of the character. A guest (?nomenu) has a random look that the browser
  // keeps, and the name of its look. ?skin=<n> shows another look. The others see the same.
  const skin = character && !params.has('skin') ? characterSkin(character) : skinSeed(params);
  const name = character?.name ?? '';
  // What the character wears (gear.ts). In a shared world the server keeps it (net.gear); in a
  // world that the page runs, the page has its own, which it does not save. A guest wears the 5e
  // kit of the class of its look.
  let gear: Gear = character?.gear ?? guestGear(skin);
  /** What the scores and some gear give in the game (traits.ts): a guest has every score at 10, and the class of its look. */
  const traitsFor = (worn: Gear): PlayerTraits => (character ? sheetTraits(character, worn) : guestTraits(skin, worn));
  // The traits follow the gear (followGear): its Armour Class, its damage, its walk.
  let traits = traitsFor(gear);
  let traitsGear = gear;
  // The hit points of the character from its last visit (all of them for a new one), and all its stamina.
  // In a shared world the welcome gives the server's word.
  const storedHp = character?.hp ?? null;
  player.hp = storedHp === null || storedHp <= 0 ? traits.maxHp : Math.min(storedHp, traits.maxHp);
  if (player.hp < traits.maxHp) player.recover = traits.recover;
  player.stamina = traits.maxStamina;
  // The refuges that the character has entered, in a world that the page runs (the server keeps them in a shared world).
  const localRefuges = [...(character?.refuges ?? [])];
  // A shared world goes through the multiplayer server; ?offline plays it alone.
  const net = definition.multiplayer && !params.has('offline') ? new NetSession(definition.id, skin, name, player, world, traits, character?.id ?? null) : null;
  // What the player carries. In a shared world the server keeps it (net.pack); in a world that
  // the page runs, the page has its own, which it does not save.
  let pack: Pack = character?.pack ?? EMPTY_PACK;
  const packNow = (): Pack => net?.pack ?? pack;
  const gearNow = (): Gear => net?.gear ?? gear;
  // The quest book of the character (quests.ts). In a shared world the server keeps it (net.quests);
  // in a world that the page runs, the page has its own, which it does not save.
  const quests = definition.quests ?? [];
  let localQuests: QuestBook = character?.quests ?? EMPTY_BOOK;
  // After an effect that went to the server: the book as it will be, until the server's word comes.
  let pendingQuests: { readonly book: QuestBook; readonly until: number } | null = null;
  const questsNow = (): QuestBook => (pendingQuests && performance.now() < pendingQuests.until ? pendingQuests.book : (net?.quests ?? localQuests));
  /** Whether conditions hold for the character now: its quests and its pack (quests.ts). */
  const holdsNow = (when: Conditions): boolean => holds(when, questsNow(), packNow());
  // The chests and the barred doors of a world that the page runs (a shared world: the server's).
  const spoils = new Spoils(world, Math.random);
  // What is left to hide of a correction from the server, in world pixels.
  const smoothing = { x: 0, y: 0 };
  // Where the character is: in a world that the page runs, the page tells the server now and then
  // and when it closes; in a shared world the server knows it. A guest has no place.
  const placeOf = character && !definition.multiplayer ? character.id : null;
  let placeSent = { x: player.x, y: player.y };
  let placeSaveAt = performance.now() + PLACE_SAVE_MS;
  /** Sends the place if the player moved since the last one. `keepalive` while the page closes. */
  const savePlace = async (keepalive = false): Promise<void> => {
    if (placeOf === null || (player.x === placeSent.x && player.y === placeSent.y)) return;
    const sent = (placeSent = { x: player.x, y: player.y });
    await api.place(placeOf, { world: definition.id, ...sent }, keepalive).catch(() => {
      // Not saved: the next time, send it again.
      if (placeSent === sent) placeSent = { x: Number.NaN, y: Number.NaN };
    });
  };
  window.addEventListener('pagehide', () => void savePlace(true));
  // An account is signed in on one device at a time: a sign-in elsewhere ends this session. The
  // page asks now and then, and when the tab shows again; a request answered 401 says it at once,
  // and so does the server of a shared world. Then the page goes back to the sign-in screen.
  if (character) {
    const checkSession = () => {
      if (document.visibilityState !== 'visible') return;
      api.me().then(
        (me) => {
          if (!me.user) backToSignIn();
        },
        // No answer (a restart of the server): ask again later.
        () => {},
      );
    };
    setInterval(checkSession, SESSION_CHECK_MS);
    document.addEventListener('visibilitychange', checkSession);
    net?.onChange(() => {
      if (net.status === 'refused' && net.refusal === 'elsewhere') backToSignIn();
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void savePlace(true);
  });

  // Two layers, each with its own CRT filter: the world, and the text in the world on top.
  // The world, from the bottom: the ground chunks; walls, fixtures, trees and players sorted by
  // depth; the faint copies of the players that show through trees; the darkness and its lights.
  // The camera moves `scene` and `textScene` together.
  const worldLayer = new Container();
  const textLayer = new Container();
  const scene = new Container();
  const textScene = new Container();
  const groundLayer = new Container();
  // Items on the ground: over the ground, under everything that stands (piles.ts).
  const pileLayer = new Container();
  const entityLayer = new Container({ sortableChildren: true });
  // The faint copies of the players that show through trees: above the props, below the darkness.
  const ghostLayer = new Container();
  // What glows above the darkness: the eyes of mobs, embers, the stars of a stun.
  const glowLayer = new Container();
  scene.addChild(groundLayer, pileLayer, entityLayer, ghostLayer);
  worldLayer.addChild(scene);
  textLayer.addChild(textScene);
  // The mouse cursor over the world: above everything, without a filter, like the GUI.
  const cursorView = new CursorView(art);
  app.stage.addChild(worldLayer, textLayer, cursorView.root);

  const font = new PixelFont(art);
  const smallFont = new PixelFont(art, 'small');
  // The text in the world, from the bottom: the signs of the buildings (the Buildings add and
  // remove them as they come and go, so they need a layer of their own), the names over heads,
  // and then every speech bubble (added later).
  const signLayer = new Container();
  const tagLayer = new Container();
  textScene.addChild(signLayer, tagLayer);
  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const buildings = new Buildings(world, art, entityLayer, signLayer, smallFont);
  const fixtures = new Fixtures(world, art, entityLayer);
  // The visitor's own skin goes first; until it is ready (a moment, for a guest), the player is a
  // darker wanderer.
  // The standing frame of the skin's sheet: the "You" section and the pack panel show it.
  let lookSheet: HTMLCanvasElement | null = null;
  let showPackLook: ((sheet: HTMLCanvasElement | null) => void) | null = null;
  /** The look of the player now: its skin seed, and what shows of its gear (the weapon, the shield). */
  const ownLook = (): SkinLook => ({ seed: skin, shown: shownGear(gearNow()) });
  // The key of the look that the player wears now (skinKey).
  let lookKey = '';
  /** Wears a look when it is ready (at once if it is), unless another one was asked for since. */
  const wearLook = (look: SkinLook) => {
    const key = skinKey(look);
    lookKey = key;
    // How it attacks follows the look at once; the frames come when the skin is ready.
    const attack = attackLook(look);
    playerView.setAttackStyle(attack.style, attack.tint);
    const apply = (textures: PlayerTextures) => {
      if (key !== lookKey) return;
      playerView.setTextures(textures);
      playerView.setPending(false);
      lookSheet = skins.sheet(look);
      you.showLook(lookSheet);
      showPackLook?.(lookSheet);
    };
    const ready = skins.get(look, apply, true);
    if (ready) apply(ready);
  };
  const playerView = new PlayerView(art, atlasPlayerTextures(art), true);
  // ?attackpose=<tick>,<direction> shows the player frozen at that tick of an attack in that
  // direction (a facing, or degrees clockwise from east): a screenshot of an attack on a slow machine.
  const [poseTick, poseWay] = (params.get('attackpose') ?? '').split(',');
  const poseAim = (['down', 'up', 'left', 'right'] as const).includes(poseWay as Facing)
    ? facingAngle(poseWay as Facing)
    : Number.isFinite(Number.parseFloat(poseWay ?? '')) ? (Number.parseFloat(poseWay!) * Math.PI) / 180 : facingAngle('down');
  const attackPose = Number.isFinite(Number.parseInt(poseTick ?? '', 10))
    ? { attack: ATTACK_TICKS - Number.parseInt(poseTick!, 10), aim: poseAim, facing: facingOfAngle(poseAim) }
    : null;
  entityLayer.addChild(playerView.root);
  ghostLayer.addChild(playerView.ghost);
  glowLayer.addChild(playerView.overlay);
  // The settings panel's "You" section: the character, and the way back to the menu.
  const look = appearanceOf(skin);
  const you = new YouSection(
    {
      name: name || skinName(skin),
      kind: `${STRINGS.races[look.race].name} ${STRINGS.classes[look.class].name.toLowerCase()}`,
      ...(character ? { scores: finalScores(character.base, character.race, character.bonus) } : {}),
      traits,
      account: character !== null,
    },
    {
      // The menu comes at the start of the page.
      mainMenu: () => {
        savePlace(true);
        location.reload();
      },
      signOut: () => void savePlace().finally(() => api.signOut().finally(() => location.reload())),
    },
  );
  wearLook(ownLook());
  const others = net ? new OtherPlayers(art, skins, entityLayer, ghostLayer, tagLayer, glowLayer, smallFont) : null;
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
  /** The player hears the lines of the NPCs within this many tiles. */
  const BARK_HEARING = 18;
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
      // Only an NPC within earshot: the people of a town far away are not heard (their bubbles would sit on the edge of the screen).
      if (pose && Math.hypot(pose.x - player.x, pose.y - player.y) > BARK_HEARING * TILE_SIZE) continue;
      // Nobody talks over the arrival: the title and the host's welcome.
      if (arriving(now)) continue;
      if (dialogKey === targetKey({ kind: 'npc', tx: def.home[0], ty: def.home[1], distance: 0, fixture: npcFixture(def) })) continue;
      barkBubbles?.say(index, text, () => npcViews!.headOf(index), now);
      linesShown++;
    }
  };
  net?.onBarks(sayLines);
  // Reputation (Charisma 13): each NPC greets the player by name once, when it comes close.
  const greeted = new Set<string>();
  const greet = (now: number) => {
    if (!barkBubbles || !name || !meetsGate(traits.scores, REPUTATION_GATE) || arriving(now)) return;
    const poses = npcPoses(now);
    const here = world.insideOf(...tileOf(player));
    npcDefs.forEach((def, index) => {
      const pose = poses[index];
      if (!def.greeting || greeted.has(def.id) || !pose || Math.hypot(pose.x - player.x, pose.y - player.y) > GREET_RANGE) return;
      // Only in the same place: both outside, or in the same building.
      if (world.insideOf(...tileOf(pose)) !== here) return;
      greeted.add(def.id);
      if (talkWith === npcFixture(def)) return;
      barkBubbles.say(index, tw(def.greeting).replace('{name}', name), () => npcViews!.headOf(index), now);
    });
  };

  // Mobs: in a world with mob rules. A single-player world runs its own horde (its seed differs
  // per page); a shared world gets them from the server.
  // ?nomobs: none (for tests that walk about, and for a quiet look).
  const mobRules = params.has('nomobs') ? null : (world.source.mobs?.() ?? null);
  const horde = mobRules && !net ? new Horde(world, mobRules, Math.floor(Math.random() * 0xffffffff)) : null;
  const mobViews = mobRules ? new MobViews(art, entityLayer, glowLayer) : null;
  const arrowViews = mobRules ? new ArrowViews(art, entityLayer, glowLayer) : null;
  // ?mob=imp,brute puts those mobs (any kinds of MOB_KINDS) near the player at the start, one tile
  // apart, 5 tiles to the east (for tests and for a look at them). Single-player worlds only.
  (params.get('mob') ?? '').split(',').forEach((kind, i) => {
    if (horde && (MOB_KINDS as readonly string[]).includes(kind)) {
      const spot = world.findSpawn(Math.floor(player.x / TILE_SIZE) + 5, Math.floor(player.y / TILE_SIZE) + i * 2 - 1, 0);
      horde.spawn(kind as MobKind, spot.x, spot.y);
    }
  });
  // The companions (NPCs that follow a player) of a world that the page runs; a shared world gets
  // the server's. ?companion=<look> puts one of that NPC look next to the player at the start,
  // following it (for tests). Single-player worlds only, as ?mob.
  const localCompanions = net ? null : new Companions(world);
  // The ambushes of the story (ambushes.ts) in a world that the page runs; the server runs them in a shared world.
  const localAmbushes = horde ? new Ambushes(world, world.source.ambushes?.() ?? []) : null;
  // The escorts of the story (escorts.ts: Himo) in a world that the page runs, with its companions.
  const localEscorts = localCompanions ? new Escorts(world.source.escorts?.() ?? []) : null;
  // The NPCs that fight and the convoys that they walk in (guards.ts, convoys.ts: the caravan), in a world that the page runs.
  const localGuards = net ? null : new Guards(world);
  const localConvoys = horde && localGuards ? new Convoys(world, world.source.convoys?.() ?? []) : null;
  if (horde && localGuards && localConvoys) {
    // A robber's arrows hit the guards of the convoy that it robs.
    horde.arrowBodies = () => localGuards.bodies(localConvoys.outlawOf({ quests: localQuests, pack }));
    horde.onArrowBody = (_owner, id, blow) => void localGuards.shot(id, 0, blow, LOCAL_DICE);
  }
  /** The kinds of guard that talk (the driver of the wagon), by their look: a guard of the server comes with its look only. */
  const talkingGuards = new Map((world.source.convoys?.() ?? []).flatMap((c) => c.members.filter((m) => m.content)).map((m) => [m.look, m] as const));
  /** A guard that talks, as a target of the action button: one fixture for each guard (by its id), so a dialog stays with it. */
  const guardFixtures = new Map<number, Fixture>();
  const guardOf = new Map<Fixture, number>();
  const guardFixture = (id: number, def: GuardDef): Fixture => {
    let fixture = guardFixtures.get(id);
    if (!fixture) {
      // Its key (targetKey) is its id: no tile has it.
      fixture = { kind: 'npc', tx: id, ty: GUARD_KEY_ROW, look: def.look, content: def.content! };
      guardFixtures.set(id, fixture);
      guardOf.set(fixture, id);
    }
    return fixture;
  };
  const companionLook = params.get('companion');
  if (localCompanions && companionLook && art.tryFrame(`npc/${companionLook}/down/stand`)) {
    localCompanions.add({ id: 'test', name: STRINGS.companion, look: companionLook, hp: PLAIN_HP, fallen: 'wakes' }, 0, player.x - TILE_SIZE, player.y);
  }
  const companionViews = new CompanionViews(art, entityLayer, ghostLayer, tagLayer, glowLayer, smallFont);
  /** The companions to draw now: the server's (100 ms in the past), or the page's own. */
  const companionsNow = (now: number): CompanionPose[] =>
    net
      ? net.companionsAt(now)
      : [...(localCompanions?.list ?? []), ...(localGuards?.list ?? [])].map(({ id, def, state: c }) => ({ id, look: def.look, name: def.name, x: c.x, y: c.y, vx: c.vx, vy: c.vy, facing: c.facing, stun: c.stun, guard: c.guard, down: c.down, attack: c.attack }));
  /** The guards that talk, as targets of the action button (their place now). */
  const guardActors = (now: number): Actor[] =>
    companionsNow(now).flatMap((c) => {
      const def = c.id >= GUARD_IDS && c.down === 0 ? talkingGuards.get(c.look) : undefined;
      return def ? [{ x: c.x, y: c.y, halfWidth: def.size?.halfWidth ?? NPC_HALF_WIDTH, halfHeight: def.size?.halfHeight ?? NPC_HALF_HEIGHT, fixture: guardFixture(c.id, def) }] : [];
    });
  /** Where a guard is now (its feet), or null when it is gone. */
  const guardAt = (id: number, now: number): { x: number; y: number } | null => companionsNow(now).find((c) => c.id === id) ?? null;
  let kills = 0;
  let blows = 0;
  let hitsTaken = 0;
  let stunSeen = false;
  let shakeUntil = -Infinity;
  // In a shared world, a blow that touches a mob on the screen flashes it at once; the server rolls
  // the dice (level-3.md), and its word (the numbers, a reel, a death) comes a moment later.
  const touchMobs = (): void => {
    const now = performance.now();
    for (const mob of net?.mobsAt(now) ?? []) {
      if (mob.state !== 'dying' && attackHits(player.x, player.y, player.aim, mob.x, mob.y, MOB_STATS[mob.kind].radius - TOUCH_MARGIN, traits.reach)) mobViews?.touch(mob.id, now);
    }
  };
  // A ranger's arrows in a shared world: the page flies its own at once (the server flies the true
  // ones), and shows the hit on the mobs as it shows them; the others' arrows come from the server.
  const ownArrows: Arrow[] = [];
  let nextOwnArrow = -1;
  const flyOwnArrows = (dt: number): void => {
    if (ownArrows.length === 0) return;
    const now = performance.now();
    const living = mobsNow().filter((m) => m.state !== 'dying');
    const targets = living.map((m) => ({ x: m.x, y: m.y, radius: MOB_STATS[m.kind].radius }));
    for (const arrow of [...ownArrows]) {
      const hit = flyArrow(arrow, world, dt, targets);
      if (hit === null) continue;
      ownArrows.splice(ownArrows.indexOf(arrow), 1);
      if (hit >= 0) mobViews?.touch(living[hit]!.id, now);
    }
  };
  /** The mobs to draw and to aim at now: the local horde's, or the server's (100 ms in the past). */
  const mobsNow = (): readonly MobLook[] => (net ? net.mobsAt(performance.now()) : (horde?.mobs ?? []));
  // An attack: a click on the world, the button or Space asks for it, and the next tick in which
  // the player can attack starts it. A click aims at the point clicked (from the player's chest);
  // the button and Space aim at the nearest mob in reach, else the way the player walks or faces.
  const attackButton = mobRules ? new AttackButton() : null;
  // A dodge: Shift, the right mouse button, or the dodge button on a touch screen (with mobs only).
  const dodgeButton = mobRules ? new DodgeButton() : null;
  let dodgeAskedAt = -Infinity;
  dodgeButton?.onPress(() => (dodgeAskedAt = performance.now()));
  let attackAskedAt = -Infinity;
  /** The point of the screen (CSS pixels) that a click asked to attack, or null for the button or Space. */
  let attackClick: { readonly x: number; readonly y: number } | null = null;
  attackButton?.onPress(() => {
    attackAskedAt = performance.now();
    attackClick = null;
  });
  const mouse = new Mouse(document.getElementById('game')!);
  if (mobRules) {
    mouse.onPress((at) => {
      attackAskedAt = performance.now();
      attackClick = at;
    });
    mouse.onAltPress(() => (dodgeAskedAt = performance.now()));
  }
  /** The direction from the player's chest to a point of the screen: where the visitor sees it. */
  const aimAt = (at: { readonly x: number; readonly y: number }): number => {
    const point = camera.toWorld(at.x, at.y);
    const dx = point.x - shown.x;
    const dy = point.y - (shown.y - playerView.chestHeight);
    return Math.hypot(dx, dy) < MOUSE_DEAD_ZONE ? facingAngle(player.facing) : Math.atan2(dy, dx);
  };
  const aim = (move: MoveInput): number => {
    let best: MobLook | null = null;
    let bestD = Infinity;
    for (const mob of mobsNow()) {
      if (mob.state === 'dying') continue;
      const d = Math.hypot(mob.x - player.x, mob.y - player.y);
      // A ranger aims at the nearest mob in the range of its arrows.
      const reach = traits.ranged ? traits.range : traits.reach + MOB_STATS[mob.kind].radius + AIM_SLACK;
      if (d < bestD && d <= reach) {
        best = mob;
        bestD = d;
      }
    }
    if (best) return Math.atan2(best.y - player.y, best.x - player.x);
    if (Math.hypot(move.x, move.y) > 0.01) return Math.atan2(move.y, move.x);
    return facingAngle(player.facing);
  };

  // How many other visitors are here: an admin only, in the "You" section of the settings.
  if (net && admin) you.addLine(new PresenceLabel(net).element);
  // ?nolight shows the world without the darkness, to look at the art.
  // The night is less dark for a character with Wisdom (PlayerTraits.night).
  const lighting = params.has('nolight') ? null : new Lighting(art, app.renderer, definition.darkness * traits.night);
  if (lighting) scene.addChild(lighting.root);
  scene.addChild(glowLayer);
  // Text in the world is above the darkness, so it is readable at night.
  const speech = new SpeechBubble(art, font, { name: 'dialog' });
  textScene.addChild(speech.root);
  // Marks at the edge of the screen (Wisdom): the mobs that hunt the player out of its view, and
  // the way home (WIS 13). Above the darkness, under the speech.
  const edgeMarks = new EdgeMarks(art);
  textScene.addChildAt(edgeMarks.root, textScene.getChildIndex(speech.root));
  const homeMark = world.source.landmarks?.().find((mark) => mark.kind === 'home') ?? null;
  /** The mobs that hunt the player now, within the reach of its sense (Wisdom). */
  const huntersNow = (): MobLook[] => {
    const hunting = net ? mobsNow().filter((m) => net.hunters.has(m.id)) : (horde?.huntersOf(0) ?? []);
    return hunting.filter((m) => m.state !== 'dying' && Math.hypot(m.x - player.x, m.y - player.y) <= traits.sense);
  };
  // The visitor's own name over its head: the one it chose, or else the name of its look. It
  // hides while the player speaks (a bubble over its head).
  const ownTag = new NameTag(smallFont, tagLayer);
  let speaking = false;
  const displayName = () => name || skinName(skin);

  // The arrival: the name of the world in the middle of the screen; as it fades out, the host
  // NPC starts its welcome. ?nointro skips both (for tests and for a quick look).
  const intro = definition.intro && !params.has('nointro') ? definition.intro : null;
  const introTitle = intro ? new IntroTitle(font, intro.title) : null;
  if (introTitle) textScene.addChild(introTitle.root);
  const hostIndex = intro?.speaker ? npcDefs.findIndex((def) => def.id === intro.speaker) : -1;
  const welcome = intro?.welcome?.length ? new WelcomeSpeech(art, font, textScene) : null;
  // Scenes (scenes.ts): talks that the character overhears when it comes into their area at their step.
  const scenes = world.source.scenes?.() ?? [];
  const scenePlayer = scenes.length > 0 ? new ScenePlayer(art, font, textScene) : null;
  /** The lines of a scene as this character hears them: a line said low is a murmur without its gate (gateView). */
  const sceneLines = (scene: SceneDef) =>
    scene.lines.map((line) => {
      const index = npcDefs.findIndex((def) => def.id === line.npc);
      const view = line.gate ? gateView(traits.scores, line.gate) : 'open';
      return {
        text: view === 'open' ? tw(line.text) : STRINGS.murmur(view === 'hint' ? gateTag(line.gate!) : null),
        anchor: () => (index >= 0 && npcViews ? npcViews.headOf(index) : { x: shown.x, y: shown.y - playerView.headHeight }),
        started: (now: number) => {
          if (index >= 0) barkBubbles?.hush(index, now);
        },
      };
    });
  /** The welcome starts in the middle of the title's fade-out. */
  const WELCOME_AT = INTRO_TIMING.fadeIn + INTRO_TIMING.hold + INTRO_TIMING.fadeOut / 2;
  let arrivedAt: number | null = null;
  /** The quest book that the journal and the map show (the frame loop follows questsNow()). */
  let shownBook: QuestBook | null = null;
  let welcomed = false;
  // ?introat=<ms> stops the title's clock at that moment after the arrival (the welcome then
  // starts at once if that moment is past its start): a screenshot of the title on a slow machine.
  const frozenAt = Number.parseFloat(params.get('introat') ?? '');
  const introClock = (now: number) => (Number.isFinite(frozenAt) && arrivedAt !== null ? arrivedAt + frozenAt : now);
  /** Whether the arrival is under way: the title, the wait for the welcome, or the welcome. */
  const arriving = (now: number) => intro !== null && (introTitle!.phase(introClock(now)) !== 'done' || (welcome !== null && (!welcomed || welcome.active)));
  // CRT diffusion. The world filter covers the whole screen; the display settings panel turns
  // it on and off and changes it (an admin only: the others have the defaults, and nothing that
  // this browser saved), and ?nocrt and ?crt=spread,mix,glow,scanline set it from the URL. The
  // text filter has its own fixed settings and covers only the text (its bounds plus padding), so
  // it costs little; the panel's switch turns it on and off too.
  const crt = new CrtFilter();
  worldLayer.filters = [crt];
  worldLayer.filterArea = app.screen;
  const crtText = new CrtFilter(CRT_TEXT, 8);
  textLayer.filters = [crtText];
  const settings = new SettingsPanel(crt, crtStateFrom(params, admin ? loadSavedCrt() : null), [crtText], admin);
  // The language (for every visitor): a new choice reloads the page, and the menu starts the same
  // character again in the new language.
  const language = document.createElement('div');
  language.className = 'settings-language';
  const languageHeading = document.createElement('p');
  languageHeading.className = 'settings-heading';
  languageHeading.textContent = STRINGS.settings.language;
  language.append(
    languageHeading,
    languageChoice('settings-lang lang-choice', () => {
      if (character) markResume(character.id);
      void savePlace(true).finally(() => location.reload());
    }),
  );
  settings.addSection(language);
  settings.addSection(you.element);
  // The worlds menu only when there is another world to go to.
  if (options.worlds.length > 1) new WorldMenu(options.worlds, definition);

  const keyboard = new Keyboard(window);
  const joystick = new TouchJoystick(
    document.getElementById('game')!,
    document.getElementById('stick')!,
    document.getElementById('stick-knob')!,
  );
  // C turns the sneak walk on and off: the keys walk at SNEAK_SPEED (a small push of the joystick is slow anyway).
  let sneakWalk = false;
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyC' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
    sneakWalk = !sneakWalk;
  });
  const readInput = () => {
    const keys = keyboard.vector();
    const stick = joystick.vector();
    const scale = sneakWalk ? SNEAK_SPEED : 1;
    return clampInput({ x: (keys.x + stick.x) * scale, y: (keys.y + stick.y) * scale });
  };
  /** Whether the player sneaks on purpose: the sneak walk, or a slow walk (standing still also hides it from mobs, but not on purpose). */
  const sneakingShown = () => isSneaking(player) && (sneakWalk || Math.hypot(player.vx, player.vy) > 1);

  const hud = new Hud(params.has('debug'));
  // A deploy publishes a new build: the page reloads itself at a calm moment (in the loop below),
  // and the menu starts the same character again. A lost connection (a deploy restarts the server
  // first) makes it ask often for a while.
  let newBuild = false;
  let reloading = false;
  const buildWatch = new BuildWatch(() => (newBuild = true));
  net?.onChange(() => {
    if (net.status !== 'online') buildWatch.soon();
  });
  hud.showHint(mobRules ? STRINGS.hintKeyboardFight : STRINGS.hintKeyboard);
  joystick.onTouchMode(() => hud.showHint(STRINGS.hintTouch));

  // ---------------------------------------------------------------- actions
  //
  // The action button (or E) acts on the thing that the player is very close to. A door opens
  // or closes. Anything else shows its content: pages of text over whoever speaks (the player
  // for a thing, the NPC for an NPC), one page per press, and a link card if it has a link.
  // The dialog belongs to its target: walking away closes it. An NPC with a dialog starts a
  // conversation instead: it says its first line, and a moment later the conversation panel
  // opens with the answers (ui/conversation.ts). While the panel is open, the player stands still
  // and the panel has the keys; the conversation ends with an answer that ends it, with Esc, or
  // when the NPC is not close any more.
  const contentOf = (t: InteractionTarget): Interaction | null => {
    // A thing with a variant says and does something else for a character at its step (Fixture.variant.content).
    const content = t.fixture ? fixtureContent(t.fixture, questsNow(), packNow()) : undefined;
    if (content) {
      if (!content.lore) return content;
      // Pages behind a gate (lore): read with the score, a clue with 1 or 2 less, nothing with less (gateView).
      const extra = content.lore.flatMap((lore) => {
        const view = gateView(traits.scores, lore.gate);
        return view === 'open' ? lore.pages : view === 'hint' ? [STRINGS.loreHint(gateTag(lore.gate))] : [];
      });
      return { ...content, pages: [...(content.pages ?? []), ...extra] };
    }
    const line = definition.examine[t.kind];
    return line ? { pages: [line] } : null;
  };
  /** Whether the player may rest in a bed: its own, or one of a refuge that its character has (the room at the inn). */
  const mayRest = (fixture: Fixture): boolean => {
    const restFor = fixture.content?.restFor;
    return !restFor || (net?.refuges ?? localRefuges).includes(restFor);
  };
  /** A line of a gate that the player does not pass: with a clue of the gate when it is 1 or 2 short (gateView), else the plain line. */
  const shortOf = (gate: Gate, clue: string, plain: string): string => (gateView(traits.scores, gate) === 'hint' ? `${clue} ${gateTag(gate)}` : plain);
  const accept = (kind: InteractionTarget['kind'], fixture: Fixture | null) => Boolean(fixture?.content ?? definition.examine[kind]) || (fixture !== null && spoils.isSource(fixture));
  /** Over the player's head: where it speaks. */
  const playerHead = () => ({ x: shown.x, y: shown.y - playerView.headHeight });
  /** The player says a line (a door, a chest, a full pack). */
  const say = (line: string, now: number) => {
    speech.show([line], playerHead, now);
    speaking = true;
  };
  // What the player finds: drops rise over its head; a chest's contents it says. In a shared world
  // the server's word comes a moment after the kill or the press.
  const lootText = new LootText(smallFont, tagLayer);
  // What the dice of a fight did (level-3.md): numbers over the mobs that the player's blows touch, and over the player.
  const fightNumbers = new FightNumbers(smallFont, tagLayer);
  /** The number of a blow of the player on mob `id`: its damage, a critical hit, or a miss. */
  const showBlow = (id: number, damage: number, crit: boolean): void => {
    const mob = mobsNow().find((m) => m.id === id);
    if (!mob) return;
    blows++;
    const now = performance.now();
    const y = mob.y - mobHead(mob.kind) - 4;
    if (damage === 0) fightNumbers.show(STRINGS.fight.miss, FIGHT_INK.miss, mob.x, y, now);
    else fightNumbers.show(crit ? STRINGS.fight.crit(damage) : String(damage), crit ? FIGHT_INK.crit : FIGHT_INK.blow, mob.x, y, now);
  };
  net?.onBlows((list) => {
    for (const [id, damage, crit] of list) showBlow(id, damage, crit === 1);
  });
  // The hit points and the glancing blows of the player, as the last frame saw them: a change shows a number.
  let numbersHp = player.hp;
  let numbersGlance = player.glance;
  // The hit points, the stamina and the effects (top left); a red flash on a hit, a dark veil on a defeat.
  const vitals = new Vitals();
  /** Wakes the player after a defeat, in a world that the page runs: at home or at the nearest refuge; half of the coins go. */
  const wakeHere = (): void => {
    const at = wakePoint(world, player.x, player.y, net?.refuges ?? localRefuges);
    wakePlayer(player, at.x, at.y, traits);
    previous.x = player.x;
    previous.y = player.y;
    const lost = net ? 0 : Math.floor(pack.coins / 2);
    if (lost > 0) pack = { coins: pack.coins - lost, items: pack.items };
    say(lost > 0 ? STRINGS.wokeLost(lost) : STRINGS.woke, performance.now());
  };
  net?.onWoke((lost) => say(lost > 0 ? STRINGS.wokeLost(lost) : STRINGS.woke, performance.now()));
  net?.onRefuges(() => say(STRINGS.refuge, performance.now()));
  /** A drink (or herbs to chew, with Medicine), from the belt or the pack panel: the server in a shared world, the page in its own world. */
  const drinkKind = (kind: ItemKind): void => {
    const now = performance.now();
    const gate = DRINKS[kind]?.gate;
    if (gate && !meetsGate(traits.scores, gate)) return;
    if (net) {
      if (!hasItems(packNow(), [{ kind, count: 1 }]) || player.down > 0 || !net.drink(ITEM_KINDS.indexOf(kind))) return;
    } else {
      const next = drinkFrom(pack, kind, player, traits, LOCAL_DICE);
      if (!next) return;
      pack = next;
    }
    const line = STRINGS.drank[kind];
    if (line) say(line, now);
  };
  // Items on the ground: the server keeps them in a shared world; the page keeps its own in a world that it runs.
  const localPiles = new Piles(world);
  const pilesNow = (): readonly Pile[] => (net ? net.pilesNow() : localPiles.list);
  const pileViews = new PileViews(art, pileLayer, entityLayer, glowLayer);
  /**
   * Puts `count` items of place `slot` (of `kind`: a slot of the pack, or a worn slot) on the
   * ground: just in front of the player, or tossed towards `screen` (a point of the screen: the
   * player dragged them onto the world there).
   */
  const dropItems = (slot: number, kind: ItemKind, count: number, screen?: { readonly x: number; readonly y: number }): void => {
    const toward = screen ? camera.toWorld(screen.x, screen.y) : undefined;
    if (player.down > 0) return;
    if (net) {
      if (!net.put(slot, kind, count, toward)) say(STRINGS.dropOffline, performance.now());
      return;
    }
    const worn = gearSlotAt(slot);
    if (worn !== null) {
      const next = count === 1 ? dropWorn(gear, worn, kind) : null;
      if (!next) return;
      gear = next;
    } else {
      const next = removeFromSlot(pack, slot, kind, count);
      if (!next) return;
      pack = next;
    }
    const at = toward ? tossPoint(world, player, toward.x, toward.y) : dropPoint(world, player);
    localPiles.put(at.x, at.y, [{ kind, count }], performance.now(), player);
  };
  /** Moves an item from place `from` to place `to`: a stack in the pack, or an item that the character puts on or takes off. */
  const moveItems = (from: number, to: number): void => {
    // A defeated character does not change what it wears.
    if (player.down > 0 && (gearSlotAt(from) !== null || gearSlotAt(to) !== null)) return;
    if (net) {
      net.move(from, to);
      return;
    }
    const moved = moveItem({ pack, gear }, from, to, traits.slots, traits.class);
    if (!moved) return;
    pack = moved.pack;
    gear = moved.gear;
  };
  const packPanel = new PackPanel(art, !character ? STRINGS.pack.guest : !net ? STRINGS.pack.offline : null, { drink: drinkKind, drop: dropItems, move: moveItems }, definition.items);
  if (lookSheet) packPanel.showLook(lookSheet);
  showPackLook = (sheet) => packPanel.showLook(sheet);
  // The drinks that the character carries, under its hit points: a press or a key (1 to 4) drinks one.
  const belt = new DrinkBelt(art, vitals.element, traits.scores, drinkKind);
  // The map (Intelligence): the chunks that the character has seen; the server keeps them in a shared world.
  const localExplored = new Set((character?.explored ?? []).map(([cx, cy]) => `${cx},${cy}`));
  const mapPanel = new MapPanel(world, traits.scores.int, net && character ? null : STRINGS.map.alone);
  /**
   * The traits follow the gear: when what the character wears changes (a move, a drop, the
   * server's word), its traits change at once, and the panels that show the scores of the gates
   * (the luck of the gear) follow.
   */
  const followGear = (): void => {
    const worn = gearNow();
    if (worn === traitsGear) return;
    traitsGear = worn;
    traits = traitsFor(worn);
    net?.setTraits(traits);
    // An amulet of health that comes off takes its hit points with it (the server does the same).
    player.hp = Math.min(player.hp, traits.maxHp);
    player.stamina = Math.min(player.stamina, traits.maxStamina);
    belt.setScores(traits.scores);
    mapPanel.setInt(traits.scores.int);
    you.setTraits(traits);
    // The figure holds what it wears now.
    const look = ownLook();
    if (skinKey(look) !== lookKey) wearLook(look);
  };
  /** Puts what a kill dropped into the pack of a world that the page runs; what does not fit falls on the ground at the mob (`at`). */
  const takeDrop = (drop: Loot, now: number, at: { readonly x: number; readonly y: number }) => {
    if (lootIsEmpty(drop)) return;
    const result = addToPack(pack, drop, traits.slots);
    pack = result.pack;
    lootText.add(dropLines(result.taken), now);
    if (result.left.items.length > 0) localPiles.put(at.x, at.y, result.left.items, now, at);
    if (!lootIsEmpty(result.left)) say(STRINGS.packFull, now);
  };
  /** The last source of loot that this page asked the server to open (its line: a pick, herbs, a cache). */
  let lastSource: Fixture | null = null;
  net?.onLoot(({ source, loot, full }) => {
    const now = performance.now();
    if (source === 'locked') {
      say(STRINGS.locked, now);
      return;
    }
    if (source === 'chest') {
      say(sourceLine(lastSource, loot, full), now);
      return;
    }
    // A drop, or a pile that the player picked up: the lines rise over its head.
    lootText.add(dropLines(loot), now);
    if (full) say(STRINGS.packFull, now);
  });
  const action = new ActionButton();
  const linkCard = new LinkCard();
  let target: InteractionTarget | null = null;
  let dialogKey: string | null = null;
  /** A conversation that is about to open (the NPC says its first line), and the NPC of the conversation. */
  /** A conversation that opens soon: its dialog, its face when it is not the thing's (Interaction.face), and whether it is a dream. */
  let pendingTalk: { readonly at: number; readonly dialog: Dialog; readonly face?: string; readonly dream?: boolean } | null = null;
  /** The veil of a dream (ui/dream.ts): over the world, under the panels. */
  const dreamVeil = new DreamVeil(document.getElementById('game'));
  let talkWith: Fixture | null = null;
  let talkAnchor = (): { x: number; y: number } => ({ x: shown.x, y: shown.y });
  // The journal (a panel of the quests), the banner when a quest changes, and the marks of the map.
  const journal = quests.length > 0 ? new JournalPanel(quests, net && character ? null : STRINGS.journal.alone) : null;
  const banner = new QuestBanner(font);
  textScene.addChild(banner.root);
  fixtures.setHolds(holdsNow);
  /** A quest started, moved on or ended: a banner for each change, and the journal's button shines. */
  const questsChanged = (before: QuestBook, after: QuestBook): void => {
    for (const change of questChanges(before, after, quests)) {
      const kicker = change.kind === 'start' ? STRINGS.journal.started : change.kind === 'end' ? STRINGS.journal.ended : STRINGS.journal.moved;
      banner.show(kicker, tw(change.quest.title));
      journal?.notice();
    }
  };
  net?.onQuests((before, after) => {
    pendingQuests = null;
    questsChanged(before, after);
  });
  /**
   * An effect on a quest (an answer, a letter): the server applies it in a shared world (the page
   * shows the book as it will be until the server's word comes), the page in its own world.
   * Returns whether it went.
   */
  const applyQuest = (effect: QuestEffect, from: { readonly npc: number } | { readonly at: readonly [number, number] } | { readonly scene: string } | { readonly guard: number }): boolean => {
    const book = questsNow();
    // What the character wears counts too (ownedPack, unwearFor): Verath takes the Tear from its neck.
    if (!canApply(effect, book, ownedPack({ pack: packNow(), gear: gearNow() }))) return false;
    if (net) {
      if (!net.quest(from, effect.id)) return false;
      const next = applyEffect(effect, book, unwearFor({ pack: packNow(), gear: gearNow() }, effect.take ?? []).pack, traits.slots);
      if (next) pendingQuests = { book: next.book, until: performance.now() + PENDING_QUEST_MS };
      return true;
    }
    const carried = unwearFor({ pack, gear }, effect.take ?? []);
    const next = applyEffect(effect, localQuests, carried.pack, traits.slots);
    if (!next) return false;
    const before = localQuests;
    localQuests = next.book;
    pack = next.pack;
    gear = carried.gear;
    const now = performance.now();
    lootText.add(dropLines(next.taken), now);
    if (next.left.items.length > 0) {
      localPiles.put(player.x, player.y, next.left.items, now, player);
      say(STRINGS.packFull, now);
    }
    questsChanged(before, localQuests);
    return true;
  };
  const conversation = new ConversationPanel({
    // Each line stays over the NPC's head as long as the panel shows it.
    line: (say) => {
      // In a dream, nobody stands there: the lines are in the panel only.
      if (!dreamVeil.shown) speech.show([say], talkAnchor, performance.now(), true);
    },
    end: () => closeDialog(performance.now()),
    // A deal (an ale, a brew at the cauldron): the server makes it in a shared world; the page in its own world.
    deal: (deal) => {
      if (!talkWith || !canMakeDeal(deal, packNow(), traits)) return false;
      const index = npcIndex.get(talkWith);
      if (net) return net.deal(index !== undefined ? { npc: index } : { at: [talkWith.tx, talkWith.ty] }, deal.id);
      const next = makeDeal(deal, pack, player, traits);
      if (!next) return false;
      pack = next;
      // A room at the inn: the character gets the refuge (the server gives it in a shared world).
      if (deal.goods === 'refuge' && deal.refuge && !localRefuges.includes(deal.refuge)) {
        localRefuges.push(deal.refuge);
        say(STRINGS.refuge, performance.now());
      }
      return true;
    },
    // An effect on a quest (the server applies it in a shared world; the page in its own world).
    effect: (effect) => {
      if (!talkWith) return false;
      const index = npcIndex.get(talkWith);
      const guard = guardOf.get(talkWith);
      return applyQuest(effect, index !== undefined ? { npc: index } : guard !== undefined ? { guard } : { at: [talkWith.tx, talkWith.ty] });
    },
  });
  const openTalk = () => {
    if (!pendingTalk || !talkWith) return;
    // The price of a deal, for this player: Charisma pays less, and gets more for a sale.
    const priceOf = (deal: Deal): string | null =>
      deal.goods === 'coins' ? STRINGS.conversation.pay(dealPay(deal, traits)) : deal.price > 0 ? STRINGS.conversation.price(dealPrice(deal, traits)) : null;
    const face = pendingTalk.face ?? talkWith.look;
    if (pendingTalk.dream) dreamVeil.show();
    // What the character wears counts for the answers too (ownedPack): Verath asks for the Tear on its neck.
    conversation.start(pendingTalk.dialog, face ? art.tryFrame(`npc/${face}`) : null, traits.scores, priceOf, { book: questsNow, pack: () => ownedPack({ pack: packNow(), gear: gearNow() }) });
    pendingTalk = null;
  };
  /** Whether the NPC of the conversation is still close to the player. */
  const talkingClose = (now: number): boolean => {
    if (!talkWith) return false;
    const walker = npcIndex.get(talkWith);
    const guard = guardOf.get(talkWith);
    // A thing that talks (the cauldron) stands still: the middle of its anchor tile. A guard walks.
    const pose = walker !== undefined ? npcPoses(now)[walker] : guard !== undefined ? guardAt(guard, now) : { x: talkWith.tx * TILE_SIZE + TILE_SIZE / 2, y: talkWith.ty * TILE_SIZE + TILE_SIZE / 2 };
    return pose !== undefined && pose !== null && Math.hypot(pose.x - player.x, pose.y - player.y) <= TALK_RANGE;
  };

  const closeDialog = (now: number) => {
    dreamVeil.hide();
    speech.hide(now);
    linkCard.hide();
    dialogKey = null;
    pendingTalk = null;
    talkWith = null;
    conversation.close();
  };

  action.onPress((source: PressSource) => {
    // The conversation panel has the keys while it is open (and the button is hidden).
    if (!target || conversation.open) return;
    const now = performance.now();
    if (target.pile) {
      // Items on the ground: the server gives them in a shared world, the page in its own world.
      const pile = target.pile;
      if (net) {
        if (!net.pick(pile.id)) say(STRINGS.pileOffline, now);
        return;
      }
      const taken = localPiles.take(pile.id, pack, traits.slots);
      if (!taken) return;
      pack = taken.pack;
      lootText.add(dropLines(taken.taken), now);
      if (!lootIsEmpty(taken.left)) say(STRINGS.packFull, now);
      return;
    }
    if (target.kind === 'door') {
      // A door never closes on anyone: the other players, or an NPC in the doorway.
      const people = [...(net?.playersAt(now) ?? []), ...npcPoses(now)];
      const result = net ? net.door(target.tx, target.ty, people) : useDoor(world, player, target.tx, target.ty, people, traits);
      const locked = result === 'locked' ? world.buildingAt(target.tx, target.ty)?.locked : undefined;
      if (result === 'barred' || result === 'forced') {
        // Boards across the door: they hold, or they break (and the view shakes a little).
        const bar = world.buildingAt(target.tx, target.ty)?.barred;
        say(result === 'forced' ? STRINGS.forced : bar ? shortOf(bar, STRINGS.barred, STRINGS.barredPlain) : STRINGS.barred, now);
        if (result === 'forced') shakeUntil = now + SHAKE.ms;
      } else if (locked) {
        // A door that never opens: the player says the building's line.
        speech.show([locked], () => ({ x: shown.x, y: shown.y - playerView.headHeight }), now);
        speaking = true;
      } else if (result === 'blocked') {
        // Who is in the way: the player itself, or someone else (another visitor, an NPC).
        const self = Math.abs(player.x - (target.tx * TILE_SIZE + TILE_SIZE / 2)) < TILE_SIZE / 2 + 5 && player.y + 3 > target.ty * TILE_SIZE && player.y - 3 < (target.ty + 1) * TILE_SIZE;
        speech.show([self ? STRINGS.doorBlocked : STRINGS.doorBlockedByOther], () => ({ x: shown.x, y: shown.y - playerView.headHeight }), now);
        speaking = true;
      }
      buildings.refreshDoor(target.tx, target.ty);
      return;
    }
    const key = targetKey(target);
    // A bed rests, unless its variant has something else for this character (the dream of Verath: dream.ts).
    if (target.fixture && fixtureContent(target.fixture, questsNow(), packNow())?.rest && mayRest(target.fixture)) {
      // The player's own bed (or its room at the inn): a rest (all hit points and stamina back). The server rests it in a shared world.
      dialogKey = key;
      linkCard.hide();
      if (net) {
        if (!net.use(target.tx, target.ty)) rest(player, traits);
      } else rest(player, traits);
      say(STRINGS.rested, now);
      return;
    }
    if (target.fixture && spoils.isSource(target.fixture)) {
      // A source of loot (a chest, herbs, a cache): the server opens it in a shared world, the page in its own world.
      dialogKey = key;
      linkCard.hide();
      const lock = target.fixture.lock;
      if (lock && !meetsGate(traits.scores, lock)) {
        say(shortOf(lock, STRINGS.locked, STRINGS.lockedPlain), now);
        return;
      }
      if (net) {
        lastSource = target.fixture;
        if (!net.use(target.tx, target.ty)) say(STRINGS.chestOffline, now);
        return;
      }
      const opened = spoils.open(target.fixture, pack, traits, now);
      if (!opened) return;
      if (opened === 'locked') {
        say(STRINGS.locked, now);
        return;
      }
      pack = opened.pack;
      say(sourceLine(target.fixture, opened.taken, opened.full), now);
      return;
    }
    const content = contentOf(target);
    if (!content) return;
    if (key === dialogKey) {
      // A second press while the NPC says its first line opens the answers at once.
      if (content.dialog) {
        openTalk();
        return;
      }
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
    const guard = fixture ? guardOf.get(fixture) : undefined;
    const anchor =
      content.speaker === 'fixture' && fixture
        ? walker !== undefined
          ? () => npcViews!.headOf(walker)
          : guard !== undefined
            ? () => {
                const at = guardAt(guard, performance.now()) ?? shown;
                return { x: at.x, y: at.y - GUARD_HEAD };
              }
            : () => Fixtures.headOf(fixture)
        : () => ({ x: shown.x, y: shown.y - playerView.headHeight });
    if (content.dialog && fixture) {
      // A dream opens at once, with no bubble over the bed.
      if (!content.dream) speech.show([content.dialog.nodes[startNode(content.dialog, questsNow(), packNow())]!.say], anchor, now, true);
      speaking = false;
      linkCard.hide();
      talkWith = fixture;
      talkAnchor = anchor;
      pendingTalk = { at: content.dream ? now : now + TALK_DELAY_MS, dialog: content.dialog, ...(content.face ? { face: content.face } : {}), ...(content.dream ? { dream: true } : {}) };
      return;
    }
    speech.show(content.pages ?? [], anchor, now);
    speaking = !(content.speaker === 'fixture' && fixture);
    // A thing that starts or moves a quest when the character reads it (a letter).
    if (content.effect && fixture) applyQuest(content.effect, { at: [target.tx, target.ty] });
    if (content.link) linkCard.show(content.link);
    else linkCard.hide();
  });

  const actionLabel = (t: InteractionTarget): string => {
    if (t.pile) return STRINGS.pickUp(STRINGS.pack.stack(t.pile.count, STRINGS.items[t.pile.kind]));
    if (t.kind === 'door') {
      const bar = world.doorBar(t.tx, t.ty);
      if (bar) return meetsGate(traits.scores, bar) ? STRINGS.forceDoor : STRINGS.tryDoor;
      return world.isDoorLocked(t.tx, t.ty) ? STRINGS.tryDoor : world.isDoorOpen(t.tx, t.ty) ? STRINGS.closeDoor : STRINGS.openDoor;
    }
    if (t.fixture?.content?.rest && mayRest(t.fixture)) return STRINGS.rest;
    if (t.fixture && spoils.isSource(t.fixture)) {
      if (t.fixture.kind === 'herbpatch') return STRINGS.gather;
      if (t.fixture.kind === 'cache') return STRINGS.dig;
      return t.fixture.lock && meetsGate(traits.scores, t.fixture.lock) ? STRINGS.pickLock : STRINGS.openChest;
    }
    const content = contentOf(t);
    if (targetKey(t) === dialogKey) {
      if (content?.dialog) return STRINGS.conversation.answer;
      if (speech.showing && speech.hasMore) return STRINGS.next;
      if (content?.link && linkCard.visible) return content.link.label;
      return STRINGS.close;
    }
    if (t.kind === 'npc') return STRINGS.talk;
    if (t.kind === 'portal') return STRINGS.lookIntoPortal;
    if (t.kind === 'signpost') return STRINGS.readSign;
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
    followGear();
    previous.x = player.x;
    previous.y = player.y;
    // In a conversation the player stands still and does not attack.
    if (conversation.open) attackAskedAt = -Infinity;
    let input: MoveInput = conversation.open ? NO_INPUT : readInput();
    if (conversation.open) dodgeAskedAt = -Infinity;
    if (performance.now() - dodgeAskedAt < ATTACK_BUFFER_MS && canDodge(player)) {
      input = { ...input, dodge: true };
      dodgeAskedAt = -Infinity;
    } else if (performance.now() - attackAskedAt < ATTACK_BUFFER_MS && canAttack(player)) {
      input = { ...input, attack: attackClick ? aimAt(attackClick) : aim(input) };
      attackAskedAt = -Infinity;
    }
    // The last tick of a defeat: after it, the player wakes. The server wakes it in a shared world.
    const waking = player.down === 1 && (!net || net.status !== 'online');
    if (net) {
      if (net.tick(input)) {
        if (traits.ranged) ownArrows.push(newArrow(nextOwnArrow--, net.id ?? 0, player.x, player.y, player.aim, traits.range, traits));
        else touchMobs();
      }
      flyOwnArrows(TICK_SECONDS);
    } else if (stepPlayer(player, input, world, traits) && horde) {
      if (traits.ranged) horde.shoot(player, player.aim, traits.range, 0, traits);
      else {
        for (const result of horde.strike(player, player.aim, undefined, 0, traits)) {
          showBlow(result.mob.id, result.damage, result.crit);
          if (result.mob.state !== 'dying') continue;
          kills++;
          takeDrop(horde.drop(result.mob), performance.now(), result.mob);
        }
        // A robber's blow also hits the guards of the convoy that it robs.
        const outlaw = localConvoys?.outlawOf({ quests: localQuests, pack }) ?? [];
        if (outlaw.length > 0) localGuards?.strike(player, player.aim, 0, traits, outlaw, LOCAL_DICE);
      }
    }
    if (waking) wakeHere();
    if (!net) {
      spoils.tick(performance.now(), [player]);
      localPiles.tick(performance.now());
      // A refuge (the chapel) that the character comes into for the first time.
      const refuge = refugeAt(world, player.x, player.y);
      if (refuge && !localRefuges.includes(refuge.id)) {
        localRefuges.push(refuge.id);
        say(STRINGS.refuge, performance.now());
      }
    }
    if (localNpcs && !net?.serverNpcs) sayLines(localNpcs.step(TICK_SECONDS * 1000, [player]).barks);
    // Mobs see the player from less far with Dexterity, and less again while it sneaks.
    // Companions follow the player (before the mobs, which hunt them too).
    let companionEvents: CompanionEvent[] = [];
    if (localCompanions && localCompanions.list.length > 0) {
      companionEvents = localCompanions.step(TICK_SECONDS * 1000, new Map([[0, player]]));
      localCompanions.takeDoors();
    }
    // The end of an escort (home, or a fall) moves the quest on.
    if (localCompanions && localEscorts?.defs.length) for (const { effect } of localEscorts.step(localCompanions, [{ id: 0, state: player, quests: localQuests, pack }], companionEvents)) applyQuest(effect, { scene: 'escort' });
    // The guards fight and walk; an outlaw (a robber) is a foe of its convoy.
    let guardEvents: GuardEvent[] = [];
    if (localGuards && localConvoys && localGuards.list.length > 0) {
      guardEvents = localGuards.step(TICK_SECONDS * 1000, horde, [{ id: 0, state: player, outlaw: localConvoys.outlawOf({ quests: localQuests, pack }), traits }], LOCAL_DICE, localConvoys.anchors());
    }
    horde?.step(TICK_SECONDS * 1000, [{ id: 0, state: player, sight: sightOf(traits, player), traits }, ...(localCompanions?.targets() ?? []), ...(localGuards?.targets() ?? [])]);
    // An ambush that ends moves the quest on (here the page applies it: where does not matter).
    if (horde && localAmbushes) {
      for (const { effect } of localAmbushes.step(horde, [{ id: 0, state: player, quests: localQuests, pack }])) applyQuest(effect, { scene: 'ambush' });
      // During a raid, the people of the town take shelter.
      localNpcs?.setAlarm(localAmbushes.sheltered);
    }
    // The convoys start, meet their attackers and end.
    if (horde && localGuards && localConvoys?.defs.length) for (const { effect } of localConvoys.step(horde, localGuards, [{ id: 0, state: player, quests: localQuests, pack }], guardEvents)) applyQuest(effect, { scene: 'convoy' });
    for (const { mob } of horde?.takeShotKills() ?? []) {
      kills++;
      takeDrop(horde!.drop(mob), performance.now(), mob);
    }
  });

  // Make all the chunks on the screen before the first frame, so the world never appears in pieces.
  camera.follow(scene, player.x, player.y);
  terrain.update(camera.view(), Infinity);
  buildings.update(camera.view(), null, 0);
  fixtures.update(camera.view(), 0, { x: player.x, y: player.y, range: traits.seek });

  let hintShown = true;
  let nextRetainAt = 0;
  app.ticker.add((ticker) => {
    const seconds = ticker.deltaMS / 1000;
    const now = performance.now();
    sim.advance(seconds);
    followGear();
    if (now >= placeSaveAt) {
      placeSaveAt = now + PLACE_SAVE_MS;
      void savePlace();
    }
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
    const wading = inShallows(world, shown.x, shown.y);
    playerView.update(shown.x, shown.y, attackPose ? { ...player, ...attackPose, vx: 0, vy: 0 } : { ...player, wading, sneaking: sneakingShown(), poisoned: player.poison > 0 }, seconds);
    // A hit (a stun starts: from the local horde, or in a snapshot) shakes the view a little.
    if (player.stun > 0 && !stunSeen) {
      hitsTaken++;
      shakeUntil = now + SHAKE.ms;
    }
    stunSeen = player.stun > 0;
    const shake = now < shakeUntil ? SHAKE.amount * ((shakeUntil - now) / SHAKE.ms) : 0;
    camera.follow(scene, shown.x + Math.round((Math.random() - 0.5) * 2 * shake), shown.y + Math.round((Math.random() - 0.5) * 2 * shake));
    mobViews?.setReading(meetsGate(traits.scores, READ_FOE_GATE), meetsGate(traits.scores, READ_OPENING_GATE));
    mobViews?.update(mobsNow(), now, seconds);
    // A cinder adept's bolt is fire (its shooter: the mob of a negative owner).
    const kinds = new Map(mobsNow().map((m) => [m.id, m.kind]));
    const fiery = (kind: MobKind | undefined) => kind !== undefined && FIRE_SHOOTERS.has(kind);
    arrowViews?.update([
      ...(horde?.arrows ?? []).map((a) => ({ ...a, fire: fiery(a.from) })),
      ...ownArrows,
      ...(net?.arrowsAt(now) ?? []).map((a) => ({ ...a, fire: a.owner < 0 && fiery(kinds.get(-a.owner)) })),
    ]);
    // No attack from shallow water (stepPlayer).
    attackButton?.setReady(player.stun === 0 && !inShallows(world, player.x, player.y));
    dodgeButton?.setReady(canDodge(player) && !inShallows(world, player.x, player.y));
    textScene.position.copyFrom(scene.position);
    textScene.scale.copyFrom(scene.scale);
    // While the player drags a stack from the pack, the icon under the pointer is the cursor.
    cursorView.update(packPanel.dragging ? null : mouse.at, camera.zoom, app.renderer.resolution);

    const npcsNow = npcPoses(now);
    npcViews?.update(npcsNow, seconds);
    target = findInteraction(world, player, accept, [...npcActors(npcDefs, npcsNow), ...guardActors(now)], pilesNow());
    if (pendingTalk && now >= pendingTalk.at) openTalk();
    if (conversation.open) {
      // The NPC waits for a player who stands close to it; a stun, or an NPC that is not close
      // any more, ends the conversation.
      if (player.stun > 0 || player.down > 0 || !talkingClose(now)) closeDialog(now);
    } else if (dialogKey && (!target || targetKey(target) !== dialogKey)) {
      closeDialog(now);
    }
    action.setTarget(target ? actionLabel(target) : null);

    const view = camera.view();
    const inside = world.insideOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE));
    buildings.update(view, inside, seconds);
    // The spark of a pile shows only where the player can see it: outside, or in its own house.
    pileViews.toss(net ? net.takeTosses(now) : localPiles.takeTosses(), now);
    pileViews.update(pilesNow(), now, (pile) => world.insideOf(...tileOf(pile)) === inside);
    // Hidden things (herbs, a cache) show only within the reach of the character's eye (Wisdom).
    fixtures.update(view, now / 1000, { x: shown.x, y: shown.y, range: traits.seek });
    others?.update(net!.playersAt(now), seconds, view, (x, y) => inShallows(world, x, y));
    companionViews.update(companionsNow(now), seconds, view);
    // Free the skins that nobody here wears any more (now and then).
    if (now >= nextRetainAt) {
      nextRetainAt = now + 5000;
      skins.retain(new Set([lookKey, ...(others?.skinsWorn ?? [])]));
    }
    // A player who sneaks shades its torch: it sees less, and the mobs see less of it.
    const torch = { x: shown.x, y: shown.y - 14, radius: sneakingShown() ? SNEAK_TORCH : TORCH.radius, colour: TORCH.colour, flicker: true, seed: 0 };
    const fxLight = playerView.fxLight;
    lighting?.update(view, [torch, ...(fxLight ? [fxLight] : []), ...(others?.lights() ?? []), ...companionViews.lights(), ...fixtures.lights(), ...buildings.lights()], now / 1000);
    edgeMarks.update(view, huntersNow(), homeMark && meetsGate(traits.scores, HOMEWARD_GATE) ? homeMark : null, now);
    speech.update(now, view);
    ownTag.set(displayName());
    ownTag.place(shown.x, shown.y, playerView.headHeight, view, 1, !(speech.showing && speaking));
    greet(now);
    barkBubbles?.update(now, view);
    lootText.update(now, shown.x, shown.y, playerView.headHeight);
    // The player's arrows in a world that the page runs: what each one did.
    if (horde) for (const result of horde.takeShotResults()) showBlow(result.mob.id, result.damage, result.crit);
    // A hit on the player shows its damage; a mob's attack that glanced off, "miss"; a draught, what it gave back.
    if (player.down === 0 && player.hp !== numbersHp) {
      const change = player.hp - numbersHp;
      fightNumbers.show(change > 0 ? `+${change}` : String(-change), change > 0 ? FIGHT_INK.heal : FIGHT_INK.hurt, shown.x, shown.y - playerView.headHeight - PLAYER_NUMBER_RISE, now);
    }
    if (player.glance > numbersGlance) fightNumbers.show(STRINGS.fight.miss, FIGHT_INK.miss, shown.x, shown.y - playerView.headHeight - PLAYER_NUMBER_RISE, now);
    numbersHp = player.hp;
    numbersGlance = player.glance;
    fightNumbers.update(now);
    vitals.update(player, traits.maxHp, traits.maxStamina);
    if (!net || net.status !== 'online') for (const [cx, cy] of seenChunks(player.x, player.y)) localExplored.add(`${cx},${cy}`);
    // The quest book changed (an effect, the server's word): the journal, the map's marks and the answers follow.
    const book = questsNow();
    if (book !== shownBook) {
      shownBook = book;
      journal?.update(book);
      mapPanel.setMarks(questMarks(book, quests, (id) => npcDefs.find((def) => def.id === id)?.home ?? null));
      conversation.refresh();
    }
    mapPanel.update(now, player.x, player.y, net && net.explored.size > 0 ? net.explored : localExplored);
    packPanel.show(packNow(), gearNow(), traits);
    belt.show(packNow());
    // A new build: reload when it is calm (no conversation, no defeat, no mob that hunts the player).
    if (newBuild && !reloading && !conversation.open && player.down === 0 && huntersNow().length === 0) {
      reloading = true;
      hud.showHint(STRINGS.newBuild);
      if (character) markResume(character.id);
      setTimeout(() => location.reload(), RELOAD_DELAY_MS);
    }
    if (arrivedAt === null) {
      arrivedAt = now;
      introTitle?.start(now);
    }
    const introNow = introClock(now);
    introTitle?.update(introNow, view);
    banner.update(now, view);
    if (welcome && intro?.welcome && !welcomed && introNow - arrivedAt >= WELCOME_AT) {
      welcomed = true;
      const anchor = hostIndex >= 0 ? () => npcViews!.headOf(hostIndex) : () => ({ x: shown.x, y: shown.y - playerView.headHeight });
      welcome.start(intro.welcome, anchor, now);
    }
    welcome?.update(now, view);
    if (scenePlayer) {
      // A scene starts when the character comes into its area at its step, and stops if it leaves.
      const tx = Math.floor(player.x / TILE_SIZE);
      const ty = Math.floor(player.y / TILE_SIZE);
      const playing = scenePlayer.playing;
      if (playing && !inScene(playing, tx, ty, SCENE_MARGIN)) scenePlayer.stop(now);
      else if (!playing && player.down === 0) {
        const book = questsNow();
        const scene = scenes.find((s) => inScene(s, tx, ty) && holds(s.when, book, packNow()) && canApply(s.effect, book, packNow()));
        if (scene) scenePlayer.start(scene, sceneLines(scene), now);
      }
      const ended = scenePlayer.update(now, view);
      if (ended) applyQuest(ended.effect, { scene: ended.id });
    }
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
      `skin    ${skin} (${look.race} ${look.class} ${look.gender}), look ${lookKey}, name ${displayName()}${name ? '' : ' (from the look)'}`,
      `char    ${character ? `${character.id}` : 'guest'}`,
      `net     ${net ? `${net.status}, ${net.others} other${net.others === 1 ? '' : 's'}${net.rttMs === null ? '' : `, rtt ${net.rttMs.toFixed(0)} ms`}` : 'single player'}`,
      `tile    ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`,
      `facing  ${player.facing}, aim ${Math.round((player.aim * 180) / Math.PI)} deg${mouse.at ? `, mouse ${Math.round(mouse.at.x)},${Math.round(mouse.at.y)}` : ''}`,
      `target  ${target ? `${target.kind} at ${target.tx}, ${target.ty}` : '-'}`,
      ...(net
        ? [
            `others  ${
              net
                .playersAt(now)
                .map((o) => `skin ${o.skin}${o.look ? ` holds ${o.look.main ?? '-'}/${o.look.off ?? '-'}` : ''} "${o.name || skinName(o.skin)}" at ${Math.floor(o.x / TILE_SIZE)},${Math.floor(o.y / TILE_SIZE)}${o.attack ? ' attacking' : ''}${o.stun ? ' stunned' : ''}`)
                .join('; ') || '-'
            }`,
          ]
        : []),
      `inside  ${inside?.id ?? '-'}`,
      `chunks  ${terrain.chunkCount} drawn, ${world.chunkCount} in memory`,
      `fixture ${fixtures.count} shown`,
      `npcs    ${npcDefs.length ? `${npcDefs.length}, ${net?.serverNpcs ? 'from the server' : 'local'}` : '-'}`,
      `cmp     ${companionsNow(now).map((c) => `${c.name} ${Math.floor(c.x / TILE_SIZE)},${Math.floor(c.y / TILE_SIZE)}${c.stun ? ' stunned' : ''}${c.down ? ' down' : ''}`).join('; ') || '-'}${localCompanions?.list.length ? ` (${localCompanions.list.map((c) => `${c.mode}, hp ${c.state.hp}`).join('; ')})` : ''}`,
      ...(intro ? [`intro   ${introTitle!.phase(introClock(now))}, welcome ${welcome?.progress ?? '-'}${welcomed && !welcome?.active ? ' (done)' : ''}`] : []),
      ...(mobRules
        ? [
            `mobs    ${mobsNow()
              .map((m) => `${m.kind}${m.health !== undefined ? ` ${m.health}/${MOB_STATS[m.kind].health}` : ''} ${m.state} ${Math.floor(m.x / TILE_SIZE)},${Math.floor(m.y / TILE_SIZE)}`)
              .join('; ') || '-'}`,
            `fight   blows ${blows}, kills ${kills}${net ? ' (local only)' : ''}, hits ${hitsTaken}, attack ${player.attack}, stun ${player.stun}, guard ${player.guard}`,
          ]
        : []),
      `doors   ${world.openDoorList().map(([x, y]) => `${x},${y}`).join(' ') || 'all closed'}${world.forcedDoorList().length ? `, forced ${world.forcedDoorList().map(([x, y]) => `${x},${y}`).join(' ')}` : ''}`,
      `traits  str ${traits.scores.str}: damage ${formatDice(traits.damage)} +${traits.toHit} (${traits.attack}), push ${traits.push.toFixed(2)}, stagger ${traits.stagger.toFixed(2)}, slots ${traits.slots}, wade ${traits.wade ? 'yes' : 'no'}${inShallows(world, player.x, player.y) ? ' (wading)' : ''}`,
      `int     ${traits.scores.int}: opening +${traits.opening}, read ${meetsGate(traits.scores, READ_OPENING_GATE) ? 'health, wind-up' : meetsGate(traits.scores, READ_FOE_GATE) ? 'health' : '-'}, map ${traits.scores.int >= 15 ? 'secrets' : traits.scores.int >= 13 ? 'names' : traits.scores.int >= 11 ? 'houses' : 'ground'}, seen ${(net && net.explored.size > 0 ? net.explored : localExplored).size} chunks${mapPanel.isOpen ? ' (map open)' : ''}`,
      `wis     ${traits.scores.wis}: sense ${traits.sense / TILE_SIZE} tiles, seek ${traits.seek / TILE_SIZE} tiles, night ${traits.night.toFixed(2)}, home ${meetsGate(traits.scores, HOMEWARD_GATE) ? 'arrow' : '-'}; hunters ${huntersNow().length}, marks ${edgeMarks.count}`,
      `cha     ${traits.scores.cha}: buy ${traits.buyShare.toFixed(2)}, sell ${traits.sellShare.toFixed(2)}, presence ${traits.presence.toFixed(2)}, daunt ${traits.daunt.toFixed(2)}, inspire ${traits.inspire} ticks (inspired ${player.inspired}), greeted ${greeted.size}`,
      `con     ${traits.scores.con}: hp ${player.hp}/${traits.maxHp} (back in ${player.recover}), stamina ${player.stamina.toFixed(1)}/${traits.maxStamina}, stun ${traits.stun.toFixed(2)}, down ${player.down}, poison ${player.poison}, drunk ${player.drunk}, refuges ${(net?.refuges ?? localRefuges).join(' ') || '-'}`,
      `dex     ${traits.scores.dex}: cooldown ${traits.cooldown}, guard ${traits.guard}, dodge ${traits.dodgeCooldown}, sight ${traits.sight.toFixed(2)}${traits.ranged ? `, range ${traits.range}` : ''}; dodge ${player.dodge}/${player.dodgeCooldown}, sneak ${isSneaking(player) ? 'yes' : 'no'}${sneakWalk ? ' (walk)' : ''}, arrows ${(horde?.arrows.length ?? 0) + ownArrows.length + (net?.arrowsAt(now).length ?? 0)}`,
      `pack    ${packNow().coins} coins; ${packNow().items.map((s) => (s ? `${s.kind} ${s.count}` : '-')).join(', ') || 'no items'}${net?.pack ? ' (server)' : ''}`,
      `gear    ${GEAR_SLOTS.filter((slot) => gearNow()[slot] !== null).map((slot) => `${slot} ${gearNow()[slot]}`).join(', ') || 'nothing'}${net?.gear ? ' (server)' : ''}; ac ${traits.ac}, ${traits.strike.kind} +${traits.toHit} ${formatDice(traits.damage)}${traits.sneak.count > 0 ? ` (+${formatDice(traits.sneak)} sneak)` : ''}, walk ${traits.speed}`,
      `piles   ${pilesNow().length} here${net ? ' (server)' : ''}; ${pilesNow().slice(0, 4).map((p) => `${p.kind} ${p.count} at ${p.x},${p.y}`).join(', ') || 'none'}`,
      ...(npcDefs.length ? [`lines   ${linesHeard} heard, ${linesShown} shown, last ${lastLine}`] : []),
      ...(quests.length ? [`quests  ${Object.entries(questsNow()).map(([id, e]) => `${id}:${e.step}${e.flags.length ? `(${e.flags.join(',')})` : ''}`).join(' ') || '-'}${pendingQuests ? ' (pending)' : ''}${scenePlayer?.playing ? `, scene ${scenePlayer.progress}` : ''}`] : []),
      ...(npcDefs.length ? [`talk    ${conversation.current ? `${conversation.current.dialog.name}: ${conversation.current.id}, answer ${conversation.current.selected + 1} of ${conversation.current.answers.length}` : pendingTalk ? 'starting' : '-'}`] : []),
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
