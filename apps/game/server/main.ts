import { startServer } from '@game/engine-server';
import { WORLDS } from '../src/worlds.ts';

/**
 * The multiplayer server of game.azyr.io. PM2 runs it with Node (deploy/pm2.config.cjs); nginx
 * sends wss://game.azyr.io/ws to it. It hosts the worlds with `multiplayer: true`; since the town
 * left (2026-10-09) there is none, so it waits with no room. Settings come from the environment:
 *   PORT (3008), HOST (127.0.0.1), ORIGINS (comma-separated, default https://game.azyr.io).
 */
const port = Number(process.env.PORT ?? 3008);
const host = process.env.HOST ?? '127.0.0.1';
const origins = (process.env.ORIGINS ?? 'https://game.azyr.io').split(',').map((o) => o.trim()).filter(Boolean);

const server = await startServer({ worlds: WORLDS, port, host, origins });

let stopping = false;
const stop = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`[game-server] ${signal}: closing`);
  await server.close();
  process.exit(0);
};
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
