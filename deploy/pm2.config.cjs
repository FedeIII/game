// PM2 entry for the server of game.azyr.io (accounts, characters, multiplayer). scripts/deploy.sh applies it with
// `pm2 startOrReload deploy/pm2.config.cjs --update-env`. Node 24 runs the TypeScript sources
// directly (type stripping), so there is no build step for the server.
//
// The interpreter is set on purpose: without it, PM2 picks ts-node for a .ts script.
module.exports = {
  apps: [
    {
      name: 'game-server',
      cwd: '/opt/game',
      script: 'apps/game/server/main.ts',
      interpreter: '/usr/bin/node',
      env: {
        NODE_ENV: 'production',
        PORT: '3008',
        HOST: '127.0.0.1',
        // The game's own site only. azyr.io has its own server for the town (town-server, 3009).
        ORIGINS: 'https://game.azyr.io',
        // Accounts (since 2026-10-09): the Google OAuth client is in the secrets file (root, 0600),
        // the characters in the SQLite file. See deploy/README.md, "Accounts".
        ENV_FILE: '/etc/game/secret.env',
        GAME_DB: '/var/lib/game/game.db',
        PUBLIC_ORIGIN: 'https://game.azyr.io',
      },
      // The server closes every connection with code 1012 on SIGINT; the clients come back at once.
      kill_timeout: 3000,
      max_memory_restart: '300M',
    },
  ],
};
