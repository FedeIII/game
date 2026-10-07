import './style.css';
import { Application, Container, TextureSource } from 'pixi.js';
import { DEFAULT_SEED, TICK_SECONDS, TILE_SIZE, World, clampInput, createPlayer, stepPlayer } from '@game/shared';
import { loadArt } from './assets.ts';
import { Hud, showFatal } from './hud.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard } from './input/keyboard.ts';
import { FixedStep } from './loop.ts';
import { Camera } from './render/camera.ts';
import { CrtFilter } from './render/crt.ts';
import { Lighting } from './render/lighting.ts';
import { PlayerView } from './render/player-view.ts';
import { Terrain } from './render/terrain.ts';

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
  const spawn = world.findSpawn();
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
  // A subtle CRT diffusion over the whole screen. ?nocrt shows the sharp pixels, and
  // ?crt=spread,mix,glow,scanline tries other settings (an empty value keeps the default).
  const crt = params.has('nocrt') ? null : new CrtFilter(crtOverrides(params.get('crt')));
  if (crt) {
    app.stage.filters = [crt];
    app.stage.filterArea = app.screen;
  }

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
  hud.showHint('WASD or arrow keys to move');
  joystick.onTouchMode(() => hud.showHint('Touch and drag anywhere to move'));

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
    const dpr = app.renderer.resolution;
    crt?.setGrid(camera.zoom, scene.position.x * dpr, scene.position.y * dpr);
    terrain.update(camera.view(), 1);

    if (hintShown && Math.hypot(player.x - spawn.x, player.y - spawn.y) > 3 * TILE_SIZE) {
      hintShown = false;
      hud.hideHint();
    }
    hud.debug(performance.now(), () => [
      `fps     ${ticker.FPS.toFixed(0)}`,
      `tile    ${Math.floor(player.x / TILE_SIZE)}, ${Math.floor(player.y / TILE_SIZE)}`,
      `facing  ${player.facing}`,
      `chunks  ${terrain.chunkCount} drawn, ${world.chunkCount} in memory`,
      `zoom    ${camera.zoom}x (dpr ${window.devicePixelRatio})`,
      `render  ${app.renderer.name}${crt ? ' + crt' : ''}`,
      `seed    ${world.seed}`,
      `build   ${__COMMIT__}`,
    ]);
  });
}

/** Reads ?crt=spread,mix,glow,scanline. Values that are empty or not numbers keep the default. */
function crtOverrides(value: string | null): Record<string, number> {
  const names = ['spread', 'mix', 'glow', 'scanline'];
  const overrides: Record<string, number> = {};
  (value ?? '').split(',').forEach((part, i) => {
    const number = Number.parseFloat(part);
    if (names[i] && Number.isFinite(number)) overrides[names[i]] = number;
  });
  return overrides;
}

// iOS Safari ignores user-scalable=no, so stop the pinch and double-tap zoom here.
document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => event.preventDefault());
document.addEventListener('contextmenu', (event) => event.preventDefault());

start().catch(showFatal);
