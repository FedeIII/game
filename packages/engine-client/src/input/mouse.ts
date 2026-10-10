/**
 * The mouse over the world (the #game surface): where it points, a press of its main button,
 * which asks for an attack towards that point, and a press of the right button, a dodge. Over the GUI (HTML outside #game) the mouse
 * belongs to the GUI. Touch and pen input are ignored here: the joystick takes them.
 *
 * While the mouse is over the world, the surface hides the system cursor (the class
 * `own-cursor`), and the game draws its own (render/cursor.ts).
 */
export class Mouse {
  private point: { x: number; y: number } | null = null;
  private readonly listeners: ((at: { readonly x: number; readonly y: number }) => void)[] = [];
  private readonly altListeners: (() => void)[] = [];

  constructor(surface: HTMLElement) {
    const track = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return;
      this.point = { x: event.clientX, y: event.clientY };
      surface.classList.add('own-cursor');
    };
    const lose = (): void => {
      this.point = null;
      surface.classList.remove('own-cursor');
    };
    surface.addEventListener('pointermove', track);
    surface.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') return;
      track(event);
      // The right button: a dodge (the page has no menu of its own on a right click).
      if (event.button === 2) {
        event.preventDefault();
        for (const listener of this.altListeners) listener();
        return;
      }
      if (event.button !== 0) return;
      // The focus (and so the keyboard) stays on the game, and no text is selected.
      event.preventDefault();
      for (const listener of this.listeners) listener({ x: event.clientX, y: event.clientY });
    });
    // Out of the window, or onto the GUI (an element that is not inside the surface).
    surface.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') lose();
    });
    window.addEventListener('blur', lose);
  }

  /** Where the mouse points (CSS pixels from the top-left corner of the page), or null when it is not over the world. */
  get at(): { readonly x: number; readonly y: number } | null {
    return this.point;
  }

  /** Calls `listener` at each press of the right button on the world. */
  onAltPress(listener: () => void): void {
    this.altListeners.push(listener);
  }

  /** Calls `listener` with the point of each press of the main button on the world. */
  onPress(listener: (at: { readonly x: number; readonly y: number }) => void): void {
    this.listeners.push(listener);
  }
}
