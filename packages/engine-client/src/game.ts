import './style.css';
import { Application, Container, TextureSource } from 'pixi.js';
import {
  NpcCrowd,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  npcActors,
  npcFixture,
  clampInput,
  createPlayer,
  findInteraction,
  stepPlayer,
  useDoor,
  type Fixture,
  type Interaction,
  type InteractionTarget,
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
import { NpcViews } from './render/npcs.ts';
import { OtherPlayers } from './render/others.ts';
import { PixelFont } from './render/pixel-text.ts';
import { PlayerView, atlasPlayerTextures } from './render/player-view.ts';
import { SpeechBubble } from './render/speech-bubble.ts';
import { Terrain } from './render/terrain.ts';
import { skinFromSeed } from '../art/skins.ts';
import { skinSeed } from './skins/seed.ts';
import { SkinStore } from './skins/skin-store.ts';
import { ActionButton, type PressSource } from './ui/action-button.ts';
import { Hud, showFatal } from './ui/hud.ts';
import { LinkCard } from './ui/link-card.ts';
import { PresenceLabel } from './ui/presence.ts';
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
  const skin = skinSeed(params);
  // A shared world goes through the multiplayer server; ?offline plays it alone.
  const net = definition.multiplayer && !params.has('offline') ? new NetSession(definition.id, skin, player, world) : null;
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
  scene.addChild(groundLayer, entityLayer, ghostLayer);
  worldLayer.addChild(scene);
  textLayer.addChild(textScene);
  app.stage.addChild(worldLayer, textLayer);

  const font = new PixelFont(art);
  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const buildings = new Buildings(world, art, entityLayer, textScene, font);
  const fixtures = new Fixtures(world, art, entityLayer);
  // The skins: rendered in a worker, kept in localStorage. The visitor's own goes first; until
  // it is ready (a moment on the first visit), the player is a darker wanderer.
  const skins = new SkinStore();
  const ownSkin = skins.get(
    skin,
    (textures) => {
      playerView.setTextures(textures);
      playerView.setPending(false);
    },
    true,
  );
  const playerView = new PlayerView(art, ownSkin ?? atlasPlayerTextures(art), !ownSkin);
  entityLayer.addChild(playerView.root);
  ghostLayer.addChild(playerView.ghost);
  const others = net ? new OtherPlayers(art, skins, entityLayer, ghostLayer) : null;
  // Walking NPCs: the server runs them in a shared world; this crowd runs them while the client
  // is alone (a single-player world, or no server). Its seed differs per page: nobody else sees it.
  const npcDefs = world.source.npcs?.() ?? [];
  const localNpcs = npcDefs.length > 0 ? new NpcCrowd(world, npcDefs, Math.floor(Math.random() * 0xffffffff)) : null;
  const npcViews = npcDefs.length > 0 ? new NpcViews(art, npcDefs, entityLayer, ghostLayer) : null;
  const npcIndex = new Map(npcDefs.map((def, i) => [npcFixture(def), i]));
  const npcPoses = (now: number) => (net?.serverNpcs ? net.npcsAt(now) : (localNpcs?.poses ?? []));
  if (net) new PresenceLabel(net);
  // ?nolight shows the world without the darkness, to look at the art.
  const lighting = params.has('nolight') ? null : new Lighting(art, app.renderer, definition.darkness);
  if (lighting) scene.addChild(lighting.root);
  // Text in the world is above the darkness, so it is readable at night.
  const speech = new SpeechBubble(art, font);
  textScene.addChild(speech.root);
  // CRT diffusion. The world filter covers the whole screen; the display settings panel turns
  // it on and off and changes it, and ?nocrt and ?crt=spread,mix,glow,scanline set it from the
  // URL. The text filter has its own fixed settings and covers only the text (its bounds plus
  // padding), so it costs little; the panel's switch turns it on and off too.
  const crt = new CrtFilter();
  worldLayer.filters = [crt];
  worldLayer.filterArea = app.screen;
  const crtText = new CrtFilter(CRT_TEXT, 8);
  textLayer.filters = [crtText];
  new SettingsPanel(crt, crtStateFrom(params, loadSavedCrt()), [crtText]);
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
  hud.showHint(STRINGS.hintKeyboard);
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
      if (result === 'blocked') speech.show([STRINGS.doorBlocked], () => ({ x: shown.x, y: shown.y - playerView.headHeight }), now);
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
    const walker = fixture ? npcIndex.get(fixture) : undefined;
    const anchor =
      content.speaker === 'fixture' && fixture
        ? walker !== undefined
          ? () => npcViews!.headOf(walker)
          : () => Fixtures.headOf(fixture)
        : () => ({ x: shown.x, y: shown.y - playerView.headHeight });
    speech.show(content.pages ?? [], anchor, now);
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
    if (net) net.tick(readInput());
    else stepPlayer(player, readInput(), world);
    if (localNpcs && !net?.serverNpcs) localNpcs.step(TICK_SECONDS * 1000, [player]);
  });

  // Make all the chunks on the screen before the first frame, so the world never appears in pieces.
  camera.follow(scene, player.x, player.y);
  terrain.update(camera.view(), Infinity);
  buildings.update(camera.view(), null, 0);
  fixtures.update(camera.view(), 0);

  let hintShown = true;
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
    playerView.update(shown.x, shown.y, player, seconds);
    camera.follow(scene, shown.x, shown.y);
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
    others?.update(net!.playersAt(now), seconds);
    const torch = { x: shown.x, y: shown.y - 14, radius: TORCH.radius, colour: TORCH.colour, flicker: true, seed: 0 };
    lighting?.update(view, [torch, ...(others?.lights() ?? []), ...fixtures.lights(), ...buildings.lights()], now / 1000);
    speech.update(now);
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
      `skin    ${skin} (${skinFromSeed(skin).vibe})`,
      `net     ${net ? `${net.status}, ${net.others} other${net.others === 1 ? '' : 's'}${net.rttMs === null ? '' : `, rtt ${net.rttMs.toFixed(0)} ms`}` : 'single player'}`,
      `tile    ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`,
      `facing  ${player.facing}`,
      `target  ${target ? `${target.kind} at ${target.tx}, ${target.ty}` : '-'}`,
      ...(net
        ? [`others  ${net.playersAt(now).map((o) => `skin ${o.skin} at ${Math.floor(o.x / TILE_SIZE)},${Math.floor(o.y / TILE_SIZE)}`).join('; ') || '-'}`]
        : []),
      `inside  ${inside?.id ?? '-'}`,
      `chunks  ${terrain.chunkCount} drawn, ${world.chunkCount} in memory`,
      `fixture ${fixtures.count} shown`,
      `npcs    ${npcDefs.length ? `${npcDefs.length}, ${net?.serverNpcs ? 'from the server' : 'local'}` : '-'}`,
      `doors   ${world.openDoorList().map(([x, y]) => `${x},${y}`).join(' ') || 'all closed'}`,
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
