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
  type InteractionTarget,
} from '@game/shared';
import { loadArt } from './assets.ts';
import { ActionButton } from './ui/action-button.ts';
import { Hud, showFatal } from './ui/hud.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard } from './input/keyboard.ts';
import { FixedStep } from './loop.ts';
import { Camera } from './render/camera.ts';
import { CrtFilter } from './render/crt.ts';
import { Lighting } from './render/lighting.ts';
import { PLAYER_HEAD_HEIGHT, PlayerView } from './render/player-view.ts';
import { Terrain } from './render/terrain.ts';
import { SettingsPanel, crtStateFrom, loadSavedCrt } from './ui/settings-panel.ts';
import { SpeechBubble } from './ui/speech-bubble.ts';
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

  // Layers, from the bottom: the ground chunks; trees, rocks and players sorted by depth; the
  // faint copy of the player that shows through trees; the darkness of the light radius.
  const scene = new Container();
  const groundLayer = new Container();
  const entityLayer = new Container({ sortableChildren: true });
  scene.addChild(groundLayer, entityLayer);
  app.stage.addChild(scene);

  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const playerView = new PlayerView(art);
  entityLayer.addChild(playerView.root);
  scene.addChild(playerView.ghost);
  // ?nolight shows the world without the darkness, to look at the art.
  const lighting = params.has('nolight') ? null : new Lighting(art);
  if (lighting) scene.addChild(lighting.root);
  // A CRT diffusion over the whole screen. The display settings panel turns it on and
  // off and changes it; ?nocrt and ?crt=spread,mix,glow,scanline set it from the URL.
  const crt = new CrtFilter();
  app.stage.filters = [crt];
  app.stage.filterArea = app.screen;
  new SettingsPanel(crt, crtStateFrom(params, loadSavedCrt()));

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

  // Actions: the action button (or E) examines the thing that the player is very close to.
  const action = new ActionButton();
  const speech = new SpeechBubble();
  let target: InteractionTarget | null = null;
  action.onPress(() => {
    if (target) speech.say(STRINGS.examine[target.kind], performance.now());
  });

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

  let hintShown = true;
  app.ticker.add((ticker) => {
    const seconds = ticker.deltaMS / 1000;
    sim.advance(seconds);
    const x = previous.x + (player.x - previous.x) * sim.alpha;
    const y = previous.y + (player.y - previous.y) * sim.alpha;
    playerView.update(x, y, player, seconds);
    lighting?.update(x, y, performance.now() / 1000);
    camera.follow(scene, x, y);
    target = findInteraction(world, player);
    action.setTarget(target ? STRINGS.actionLabelFor(target.kind) : null);
    speech.update(performance.now(), scene.position.x + x * scene.scale.x, scene.position.y + (y - PLAYER_HEAD_HEIGHT) * scene.scale.y);
    const dpr = app.renderer.resolution;
    crt.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr);
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
