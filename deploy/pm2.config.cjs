// PM2 entry for the multiplayer server of game.azyr.io. scripts/deploy.sh applies it with
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
      },
      // The server closes every connection with code 1012 on SIGINT; the clients come back at once.
      kill_timeout: 3000,
      max_memory_restart: '300M',
    },
  ],
};
