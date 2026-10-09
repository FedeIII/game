import { startServer } from '@game/engine-server';
import { WORLDS } from '../src/worlds.ts';

/**
 * The multiplayer server of the Town of Azyr. PM2 runs it with Node (deploy/pm2.config.cjs) as
 * town-server; nginx sends wss://azyr.io/ws to it. Settings come from the environment:
 *   PORT (3009), HOST (127.0.0.1), ORIGINS (comma-separated, default https://azyr.io).
 */
const port = Number(process.env.PORT ?? 3009);
const host = process.env.HOST ?? '127.0.0.1';
const origins = (process.env.ORIGINS ?? 'https://azyr.io').split(',').map((o) => o.trim()).filter(Boolean);

const log = (line: string) => console.log(`[town-server] ${line}`);
const server = await startServer({ worlds: WORLDS, port, host, origins, log });

let stopping = false;
const stop = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  log(`${signal}: closing`);
  await server.close();
  process.exit(0);
};
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
