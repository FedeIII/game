import { NO_INPUT, type MoveInput } from '@game/shared';

/** The radius of the stick base, in CSS pixels. The CSS for #stick must agree. */
export const STICK_RADIUS = 52;

/** Pushes below this fraction of the radius give no input, so a resting thumb does not walk. */
const DEADZONE = 0.18;

/**
 * Converts a thumb offset from the stick centre (CSS pixels) to a move input. The output length
 * rises from 0 at the deadzone to 1 at the rim, so a small push walks slowly.
 */
export function stickVector(dx: number, dy: number, radius = STICK_RADIUS, deadzone = DEADZONE): MoveInput {
  const distance = Math.hypot(dx, dy);
  const push = distance / radius;
  if (push <= deadzone) return NO_INPUT;
  const strength = Math.min(1, (push - deadzone) / (1 - deadzone));
  return { x: (dx / distance) * strength, y: (dy / distance) * strength };
}

/**
 * A floating virtual joystick for touch screens. A touch anywhere on the surface puts the stick
 * under the thumb. If the thumb goes past the rim, the stick follows it, so the player can
 * turn round without a new touch. Mouse input is ignored: on a desktop the mouse is free for
 * future build and dig actions.
 */
export class TouchJoystick {
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private pointer: number | null = null;
  private originX = 0;
  private originY = 0;
  private input: MoveInput = NO_INPUT;
  private touchMode = false;
  private readonly touchModeListeners: (() => void)[] = [];

  constructor(surface: HTMLElement, base: HTMLElement, knob: HTMLElement) {
    this.base = base;
    this.knob = knob;

    surface.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      event.preventDefault();
      this.enterTouchMode();
      if (this.pointer !== null) return; // A second finger does not take over the stick.
      this.pointer = event.pointerId;
      surface.setPointerCapture(event.pointerId);
      this.originX = event.clientX;
      this.originY = event.clientY;
      this.track(event);
    });
    surface.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.pointer) this.track(event);
    });
    const release = (event: PointerEvent): void => {
      if (event.pointerId !== this.pointer) return;
      this.pointer = null;
      this.input = NO_INPUT;
      this.showIdle();
    };
    surface.addEventListener('pointerup', release);
    surface.addEventListener('pointercancel', release);
    surface.addEventListener('lostpointercapture', release);

    if (window.matchMedia('(pointer: coarse)').matches) this.enterTouchMode();
  }

  get isTouchMode(): boolean {
    return this.touchMode;
  }

  /** Calls `listener` once, when the first touch happens (or at once on a touch device). */
  onTouchMode(listener: () => void): void {
    if (this.touchMode) listener();
    else this.touchModeListeners.push(listener);
  }

  vector(): MoveInput {
    return this.input;
  }

  private enterTouchMode(): void {
    if (this.touchMode) return;
    this.touchMode = true;
    this.base.hidden = false;
    this.showIdle();
    for (const listener of this.touchModeListeners.splice(0)) listener();
  }

  private track(event: PointerEvent): void {
    let dx = event.clientX - this.originX;
    let dy = event.clientY - this.originY;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      // Pull the base behind the thumb.
      dx = (dx / distance) * STICK_RADIUS;
      dy = (dy / distance) * STICK_RADIUS;
      this.originX = event.clientX - dx;
      this.originY = event.clientY - dy;
    }
    this.input = stickVector(dx, dy);
    this.base.classList.remove('idle');
    this.base.style.transform = `translate(${this.originX - STICK_RADIUS}px, ${this.originY - STICK_RADIUS}px)`;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  /** Shows a faint stick in its rest position, so the player sees that the control exists. */
  private showIdle(): void {
    this.base.classList.add('idle');
    this.base.style.transform = '';
    this.knob.style.transform = '';
  }
}
