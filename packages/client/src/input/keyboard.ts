import { NO_INPUT, type MoveInput } from '@game/shared';

/**
 * Bindings use KeyboardEvent.code, the physical key. Thus WASD stays in the same place on
 * AZERTY and other layouts.
 */
const BINDINGS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, -1],
  KeyA: [-1, 0],
  KeyS: [0, 1],
  KeyD: [1, 0],
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
};

/** Keys typed into a form field (a slider, a future chat box) belong to that field. */
export function isFormField(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

export class Keyboard {
  private readonly held = new Set<string>();

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => {
      if (!(event.code in BINDINGS) || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault(); // The arrow keys must not scroll the page.
      this.held.add(event.code);
    });
    target.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
    });
    // A key that is released while the window has no focus never sends keyup. Without this,
    // the player walks on alone after an alt-tab.
    target.addEventListener('blur', () => this.held.clear());
    target.document.addEventListener('visibilitychange', () => this.held.clear());
  }

  /** The held keys as a unit vector, or no input. Opposite keys cancel each other. */
  vector(): MoveInput {
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      const binding = BINDINGS[code];
      if (!binding) continue;
      x += binding[0];
      y += binding[1];
    }
    x = Math.sign(x);
    y = Math.sign(y);
    if (x === 0 && y === 0) return NO_INPUT;
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }
}
