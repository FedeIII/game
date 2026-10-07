import './style.css';
import { Application, Container, TextureSource } from 'pixi.js';
import { DEFAULT_SEED, TICK_SECONDS, TILE_SIZE, World, clampInput, createPlayer, stepPlayer } from '@game/shared';
import { loadArt } from './assets.ts';
import { Hud, showFatal } from './hud.ts';
import { TouchJoystick } from './input/joystick.ts';
import { Keyboard } from './input/keyboard.ts';
import { FixedStep } from './loop.ts';
import { Camera } from './render/camera.ts';
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
    background: '#1d2b1d',
  });
  document.getElementById('game')!.appendChild(app.canvas);

  const art = await loadArt();
  const world = new World(Number.isFinite(seed) ? seed : DEFAULT_SEED);
  const spawn = world.findSpawn();
  const player = createPlayer(spawn.x, spawn.y);
  const previous = { x: player.x, y: player.y };

  // Layers: the ground chunks under everything, then trees, rocks and players sorted by depth.
  const scene = new Container();
  const groundLayer = new Container();
  const entityLayer = new Container({ sortableChildren: true });
  scene.addChild(groundLayer, entityLayer);
  app.stage.addChild(scene);

  const terrain = new Terrain(app.renderer, world, art, groundLayer, entityLayer);
  const playerView = new PlayerView(art);
  entityLayer.addChild(playerView.root);

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
    camera.follow(scene, x, y);
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
      `render  ${app.renderer.name}`,
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
