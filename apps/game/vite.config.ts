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
 * production. Start it with `npm run server` (it allows the local origins). GAME_SERVER points
 * elsewhere, for example at a test server on another port.
 */
const wsProxy = { '/ws': { target: process.env.GAME_SERVER ?? 'ws://127.0.0.1:3008', ws: true } };

export default defineConfig({
  define: {
    __COMMIT__: JSON.stringify(commit()),
  },
  build: {
    target: 'es2022',
    // Keep the atlas a separate file with a content hash, as real art will be.
    assetsInlineLimit: 0,
  },
  server: {
    host: '127.0.0.1',
    proxy: wsProxy,
  },
  preview: {
    proxy: wsProxy,
  },
});
