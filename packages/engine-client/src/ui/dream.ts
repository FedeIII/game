/**
 * The veil of a dream (story phase 10, the dream of Verath): while the conversation of a dream is
 * open (Interaction.dream), the world goes dark round the middle of the screen and ash falls over it,
 * some of it still glowing. It lies under the panels, and clicks go through it. With reduced motion,
 * no ash falls.
 */

/** The motes of ash that fall over the veil. */
const ASH_MOTES = 48;

export class DreamVeil {
  private readonly element: HTMLDivElement;

  /** Puts the veil in the page just after `after` (the game's view): over the world, and under the panels that come after it. */
  constructor(after: Element | null) {
    this.element = document.createElement('div');
    this.element.id = 'dream';
    this.element.hidden = true;
    this.element.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < ASH_MOTES; i++) {
      const mote = document.createElement('span');
      mote.className = 'dream-ash';
      // Spread over the width, each at its own pace and phase (the same every time).
      mote.style.left = `${(i * 37 + 11) % 100}%`;
      mote.style.animationDuration = `${7 + ((i * 13) % 7)}s`;
      mote.style.animationDelay = `${-((i * 1.7) % 11)}s`;
      this.element.append(mote);
    }
    if (after?.parentElement) after.after(this.element);
    else document.body.append(this.element);
  }

  get shown(): boolean {
    return !this.element.hidden;
  }

  show(): void {
    this.element.hidden = false;
    document.body.classList.add('dreaming');
  }

  hide(): void {
    this.element.hidden = true;
    document.body.classList.remove('dreaming');
  }
}
