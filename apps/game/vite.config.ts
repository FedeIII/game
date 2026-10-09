import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** The commit of the build, shown in the debug panel (F3), so a deploy can be verified. */
function commit(): string {
  try {
    return execSync('git describe --always --dirty', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

/**
 * The multiplayer server for `npm run dev` and `npm run preview`: /ws goes to it, as nginx does in
 * production. Start it with `npm run server` (port 3020; it allows the local origins). GAME_SERVER
 * points elsewhere, for example at a test server on another port. The development ports (3019 and
 * 3020) are not production's 3008, and on the laptop no other project uses them
 * (~/Projects/LOCAL_PORTS.md).
 */
const wsProxy = { '/ws': { target: process.env.GAME_SERVER ?? 'ws://127.0.0.1:3020', ws: true } };

export default defineConfig({
  define: {
    __COMMIT__: JSON.stringify(commit()),
    // The worlds that the page shares: scripts/dev.sh sets it, production does not (worlds.ts).
    __SHARED_WORLDS__: JSON.stringify(process.env.SHARED_WORLDS ?? ''),
  },
  build: {
    target: 'es2022',
    // Keep the atlas a separate file with a content hash, as real art will be.
    assetsInlineLimit: 0,
  },
  server: {
    host: '127.0.0.1',
    // A fixed port: on another port, the multiplayer server would refuse the page's origin.
    port: 3019,
    strictPort: true,
    proxy: wsProxy,
  },
  preview: {
    proxy: wsProxy,
  },
});
