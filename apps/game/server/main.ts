import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { startServer, type AccountsOptions } from '@game/engine-server';
import { WORLDS, shareWorlds } from '../src/worlds.ts';

/**
 * The server of game.azyr.io: the accounts and the characters (/api/, /auth/), and the
 * multiplayer worlds (/ws). PM2 runs it with Node (deploy/pm2.config.cjs); nginx sends /api/,
 * /auth/ and /ws to it. It hosts the worlds with `multiplayer: true`; none in production now.
 *
 * Settings come from the environment (the defaults are production's):
 *   ENV_FILE        a file of KEY=value lines to read first (production: /etc/game/secret.env;
 *                   development: .env.local, if it exists)
 *   PORT (3008), HOST (127.0.0.1), ORIGINS (comma-separated, default https://game.azyr.io)
 *   SHARED_WORLDS   comma-separated ids of worlds to share (default none; see worlds.ts)
 *   GAME_DB         the SQLite file of the accounts; without it, the server has no accounts
 *   PUBLIC_ORIGIN   the address of the page (default the first of ORIGINS)
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET   the OAuth client of the sign-in with Google
 *   AUTH_DEV_LOGIN=1   a sign-in with only a name, for development (refused in production)
 *   ADMIN_EMAILS    comma-separated emails of the admins (default none): they see the display
 *                   settings. Production: in /etc/game/secret.env; development: in .env.local
 * `npm run server` and scripts/dev.sh set the development values.
 */
const env = process.env;
const production = env.NODE_ENV === 'production';

/** Stops the start with a clear message: PM2 shows it in the log, and scripts/deploy.sh fails. */
function refuse(reason: string): never {
  console.error(`[game-server] cannot start: ${reason}`);
  process.exit(1);
}

if (env.ENV_FILE) {
  if (existsSync(env.ENV_FILE)) process.loadEnvFile(env.ENV_FILE);
  else if (production) refuse(`ENV_FILE ${env.ENV_FILE} does not exist`);
}

const port = Number(env.PORT ?? 3008);
const host = env.HOST ?? '127.0.0.1';
const origins = (env.ORIGINS ?? 'https://game.azyr.io').split(',').map((o) => o.trim()).filter(Boolean);
const worlds = shareWorlds(WORLDS, env.SHARED_WORLDS ?? '');

let accounts: AccountsOptions | undefined;
if (env.GAME_DB) {
  const google = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null;
  const devLogin = env.AUTH_DEV_LOGIN === '1';
  if (production && !google) refuse('NODE_ENV=production needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (see deploy/README.md)');
  if (production && devLogin) refuse('AUTH_DEV_LOGIN is for development only');
  if (env.GAME_DB !== ':memory:') mkdirSync(dirname(env.GAME_DB), { recursive: true, mode: 0o700 });
  const admins = (env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim()).filter(Boolean);
  accounts = { db: env.GAME_DB, publicOrigin: env.PUBLIC_ORIGIN ?? origins[0] ?? 'https://game.azyr.io', google, devLogin, admins };
} else if (production) {
  refuse('NODE_ENV=production needs GAME_DB (the accounts database)');
}

const server = await startServer({ worlds, port, host, origins, accounts });

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
