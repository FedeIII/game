/** The HTML overlay: the control hint, the debug panel and the fatal-error screen. */
export class Hud {
  private readonly hint: HTMLElement;
  private readonly debugPanel: HTMLElement;
  private debugShown: boolean;
  private nextDebugUpdate = 0;

  constructor(debug: boolean) {
    this.hint = document.getElementById('hint')!;
    this.debugPanel = document.getElementById('debug')!;
    this.debugShown = debug;
    this.debugPanel.hidden = !debug;
    window.addEventListener('keydown', (event) => {
      if (event.code !== 'F3') return;
      event.preventDefault();
      this.debugShown = !this.debugShown;
      this.debugPanel.hidden = !this.debugShown;
    });
  }

  showHint(text: string): void {
    this.hint.textContent = text;
    this.hint.classList.remove('gone');
  }

  hideHint(): void {
    this.hint.classList.add('gone');
  }

  /** Updates the debug panel at most 4 times a second. `lines` is called only when shown. */
  debug(now: number, lines: () => string[]): void {
    if (!this.debugShown || now < this.nextDebugUpdate) return;
    this.nextDebugUpdate = now + 250;
    this.debugPanel.textContent = lines().join('\n');
  }
}

export function showFatal(error: unknown): void {
  console.error(error);
  const fatal = document.getElementById('fatal');
  if (!fatal) return;
  fatal.hidden = false;
  fatal.textContent = `The game could not start: ${error instanceof Error ? error.message : String(error)}`;
}
