/**
 * Finds out when a new build of the page is published (a deploy), so that an open page can reload
 * itself. A build's main script has a hash of its content in its name (`/assets/main-<hash>.js`):
 * the page compares the script that it runs with the script that the published page names now.
 * In development (Vite serves `src/main.ts`) there is nothing to compare, and it does nothing.
 */

/** How often the page asks while it is visible (ms). */
const CHECK_MS = 60_000;
/** After a lost connection (a deploy restarts the server first), it asks this often, for this long (ms). */
const SOON_MS = 3000;
const SOON_FOR_MS = 120_000;

/** The main script that a page names: the src of its first module script, or null. */
export function scriptOf(html: string): string | null {
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    if (!/\btype=["']module["']/.test(tag)) continue;
    const src = /\bsrc=["']([^"']+)["']/.exec(tag)?.[1];
    if (src) return src;
  }
  return null;
}

/** Whether a script is the file of a build (with a content hash), not a development source. */
export function isBuildScript(src: string | null): src is string {
  return src !== null && /\/assets\/[^/]+\.js$/.test(src);
}

/**
 * Watches for a new build of the page, and calls `onNew` once when there is one. `soon()` asks
 * often for a while: call it when the connection to the server is lost.
 */
export class BuildWatch {
  private readonly own: string | null;
  private readonly onNew: () => void;
  private found = false;
  private asking = false;
  private soonUntil = 0;
  private soonTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onNew: () => void) {
    this.onNew = onNew;
    const own = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src') ?? null;
    this.own = isBuildScript(own) ? own : null;
    if (!this.own) return;
    setInterval(() => void this.check(), CHECK_MS);
    document.addEventListener('visibilitychange', () => void this.check());
  }

  /** Asks every SOON_MS for the next SOON_FOR_MS. */
  soon(): void {
    if (!this.own || this.found) return;
    this.soonUntil = Date.now() + SOON_FOR_MS;
    if (this.soonTimer) return;
    const tick = () => {
      this.soonTimer = null;
      void this.check();
      if (Date.now() < this.soonUntil && !this.found) this.soonTimer = setTimeout(tick, SOON_MS);
    };
    this.soonTimer = setTimeout(tick, SOON_MS);
  }

  private async check(): Promise<void> {
    if (!this.own || this.found || this.asking || document.visibilityState !== 'visible') return;
    this.asking = true;
    try {
      const response = await fetch(location.pathname, { cache: 'no-store', credentials: 'same-origin' });
      const published = response.ok ? scriptOf(await response.text()) : null;
      // Only another build counts: a page without a script (an error page of a proxy) does not.
      if (isBuildScript(published) && published !== this.own) {
        this.found = true;
        this.onNew();
      }
    } catch {
      // No answer (the network, a restart): ask again later.
    } finally {
      this.asking = false;
    }
  }
}
