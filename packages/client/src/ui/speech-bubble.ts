/** How long a line stays, in milliseconds. */
const DURATION = 2500;

/**
 * A speech bubble over the player's head. It is HTML, in the GUI style, so the text stays sharp
 * (the CRT filter blurs only the game). The game moves it every frame to follow the player.
 */
export class SpeechBubble {
  private readonly element: HTMLElement;
  private hideAt = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'speech';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    document.body.append(this.element);
  }

  /** Shows a line from `now` (performance.now()) for DURATION. A new line replaces the old one. */
  say(text: string, now: number): void {
    this.element.textContent = text;
    this.element.classList.add('shown');
    this.hideAt = now + DURATION;
  }

  /** Puts the tip of the bubble's tail at (x, y), in CSS pixels, and hides the bubble when its time is over. */
  update(now: number, x: number, y: number): void {
    if (now >= this.hideAt) this.element.classList.remove('shown');
    this.element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
  }
}
