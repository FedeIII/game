/**
 * The hold of the dodge input (Shift, the right mouse button, the dodge button), for the guard stance
 * of the sandbox (mechanics.ts: a hold raises a guard, a tap stays a roll). With the guard stance on,
 * a press does not roll at once: a release within GUARD_HOLD_MS is a tap, which rolls; a longer hold is
 * the guard, until the release. Two inputs can hold it at once (Shift and the button): it holds until
 * the last one lets go.
 */

/** A press held this long (ms) is a guard, not a roll. */
export const GUARD_HOLD_MS = 200;

export class DodgeHold {
  private readonly held = new Set<string>();
  private pressedAt: number | null = null;

  /** A press of input `source` at `now` (ms). */
  press(source: string, now: number): void {
    if (this.held.size === 0) this.pressedAt = now;
    this.held.add(source);
  }

  /** The release of input `source` at `now`: true when it ends a tap (a roll). */
  release(source: string, now: number): boolean {
    if (!this.held.delete(source) || this.held.size > 0) return false;
    const tap = this.pressedAt !== null && now - this.pressedAt < GUARD_HOLD_MS;
    this.pressedAt = null;
    return tap;
  }

  /** Every input lets go (the page lost the focus): no roll. */
  clear(): void {
    this.held.clear();
    this.pressedAt = null;
  }

  /** Whether the input is held long enough for a guard at `now`. */
  guarding(now: number): boolean {
    return this.pressedAt !== null && now - this.pressedAt >= GUARD_HOLD_MS;
  }
}
