import './style.css';
import { Application, Container, TextureSource } from 'pixi.js';
import {
  DEFAULT_SEED,
  TICK_SECONDS,
  TILE_SIZE,
  World,
  clampInput,
  createPlayer,
  findInteraction,
  stepPlayer,
  useDoor,
  type InteractionTarget,
} from '@game/shared';
import { loadArt } from './assets.ts';
import { ActionButton } from './ui/action-button.ts';
import { Hud, showFatal } from './ui/hud.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard } from './input/keyboard.ts';
import { FixedStep } from './loop.ts';
import { Buildings } from './render/buildings.ts';
import { Camera } from './render/camera.ts';
import { CRT_TEXT, CrtFilter } from './render/crt.ts';
import { Lighting } from './render/lighting.ts';
import { PixelFont } from './render/pixel-text.ts';
import { PLAYER_HEAD_HEIGHT, PlayerView } from './render/player-view.ts';
import { SpeechBubble } from './render/speech-bubble.ts';
import { Terrain } from './render/terrain.ts';
import { SettingsPanel, crtStateFrom, loadSavedCrt } from './ui/settings-panel.ts';
import { STRINGS } from './ui/strings.ts';

async function start(): Promise<void> {
  const params = new URLSearchParams(location.search);
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
  const world = new World(Number.isFinite(seed) ? seed : DEFAULT_SEED);
  // ?at=tx,ty starts on (or next to) that tile, for tests and for a look at one place.
  const at = (params.get('at') ?? '').split(',').map((v) => Number.parseInt(v, 10));
  const spawn = at.length === 2 && at.every(Number.isFinite) ? world.findSpawn(at[0], at[1], 0) : world.findSpawn();
  const player = createPlayer(spawn.x, spawn.y);
  const previous = { x: player.x, y: player.y };

  // Two layers, each with its own CRT filter: the world, and the text in the world on top.
  // The world, from the bottom: the ground chunks; trees, rocks and players sorted by depth;
  // the faint copy of the player that shows through trees; the darkness of the light radius.
  // The camera moves `scene` and `textScene` together.
  const worldLayer = new Container();
  const textLayer = new Container();
  const scene = new Container();
  const textScene = new Container();
  const groundLayer = new Container();
  const entityLayer = new Container({ sortableChildren: true });
  scene.addChild(groundLayer, entityLayer);
  worldLayer.addChild(scene);
  textLayer.addChild(textScene);
  app.stage.addChild(worldLayer, textLayer);

  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const buildings = new Buildings(world, art, entityLayer);
  const playerView = new PlayerView(art);
  entityLayer.addChild(playerView.root);
  scene.addChild(playerView.ghost);
  // ?nolight shows the world without the darkness, to look at the art.
  const lighting = params.has('nolight') ? null : new Lighting(art);
  if (lighting) scene.addChild(lighting.root);
  // Text in the world is above the darkness, so it is readable at night.
  const speech = new SpeechBubble(art, new PixelFont(art));
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

  // Actions: the action button (or E) acts on the thing that the player is very close to: it
  // opens or closes a door, and examines anything else.
  const action = new ActionButton();
  let target: InteractionTarget | null = null;
  action.onPress(() => {
    if (!target) return;
    if (target.kind === 'door') {
      if (useDoor(world, player, target.tx, target.ty) === 'blocked') speech.say(STRINGS.doorBlocked, performance.now());
      buildings.refreshDoor(target.tx, target.ty);
      return;
    }
    speech.say(STRINGS.examine[target.kind], performance.now());
  });
  const actionLabel = (t: InteractionTarget): string => {
    if (t.kind === 'door') return world.isDoorOpen(t.tx, t.ty) ? STRINGS.closeDoor : STRINGS.openDoor;
    return STRINGS.actionLabelFor(t.kind);
  };

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
    stepPlayer(player, readInput(), world);
  });

  // Make all the chunks on the screen before the first frame, so the world never appears in pieces.
  camera.follow(scene, player.x, player.y);
  terrain.update(camera.view(), Infinity);
  buildings.update(camera.view(), null, 0);

  let hintShown = true;
  app.ticker.add((ticker) => {
    const seconds = ticker.deltaMS / 1000;
    sim.advance(seconds);
    const x = previous.x + (player.x - previous.x) * sim.alpha;
    const y = previous.y + (player.y - previous.y) * sim.alpha;
    playerView.update(x, y, player, seconds);
    lighting?.update(x, y, performance.now() / 1000);
    camera.follow(scene, x, y);
    textScene.position.copyFrom(scene.position);
    textScene.scale.copyFrom(scene.scale);
    target = findInteraction(world, player);
    action.setTarget(target ? actionLabel(target) : null);
    const inside = world.insideOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE));
    buildings.update(camera.view(), inside, seconds);
    speech.update(performance.now(), x, y - PLAYER_HEAD_HEIGHT);
    const dpr = app.renderer.resolution;
    crt.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr, dpr);
    crtText.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr, dpr);
    terrain.update(camera.view(), 1);

    if (hintShown && Math.hypot(player.x - spawn.x, player.y - spawn.y) > 3 * TILE_SIZE) {
      hintShown = false;
      hud.hideHint();
    }
    hud.debug(performance.now(), () => [
      `fps     ${ticker.FPS.toFixed(0)}`,
      `tile    ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`,
      `facing  ${player.facing}`,
      `target  ${target ? `${target.kind} at ${target.tx}, ${target.ty}` : '-'}`,
      `inside  ${world.insideOf(Math.floor(player.x / TILE_SIZE), Math.floor(player.y / TILE_SIZE))?.id ?? '-'}`,
      `chunks  ${terrain.chunkCount} drawn, ${world.chunkCount} in memory`,
      `zoom    ${camera.zoom}x (dpr ${window.devicePixelRatio})`,
      `render  ${app.renderer.name}${crt.enabled ? ' + crt' : ''}`,
      `seed    ${world.seed}`,
      `build   ${__COMMIT__}`,
    ]);
  });
}

// iOS Safari ignores user-scalable=no, so stop the pinch and double-tap zoom here.
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());

start().catch(showFatal);
