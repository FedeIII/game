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
  },
});
