// PM2 entry for the multiplayer server of the Town of Azyr (the landing page of azyr.io).
// scripts/deploy.sh applies it with `pm2 startOrReload deploy/pm2.config.cjs --update-env`.
// Node 24 runs the TypeScript sources directly (type stripping), so there is no build step for
// the server.
//
// This is NOT game-server: that one belongs to game.azyr.io (/opt/game, branch main, port 3008).
// The town has its own process, port and checkout, so a game deploy never touches it.
//
// The interpreter is set on purpose: without it, PM2 picks ts-node for a .ts script.
module.exports = {
  apps: [
    {
      name: 'town-server',
      cwd: '/opt/azyr-town',
      script: 'apps/game/server/main.ts',
      interpreter: '/usr/bin/node',
      env: {
        NODE_ENV: 'production',
        PORT: '3009',
        HOST: '127.0.0.1',
        ORIGINS: 'https://azyr.io,https://www.azyr.io',
      },
      // The server closes every connection with code 1012 on SIGINT; the clients come back at once.
      kill_timeout: 3000,
      max_memory_restart: '300M',
    },
  ],
};
