import { describe, expect, it } from 'vitest';
import { DodgeHold, GUARD_HOLD_MS } from './dodge-hold.ts';

describe('the hold of the dodge input', () => {
  it('is a tap (a roll) when it lets go soon, and a guard while it is held long', () => {
    const hold = new DodgeHold();
    hold.press('shift', 1000);
    expect(hold.guarding(1000 + GUARD_HOLD_MS - 1)).toBe(false);
    expect(hold.release('shift', 1000 + GUARD_HOLD_MS - 1)).toBe(true);
    hold.press('shift', 2000);
    expect(hold.guarding(2000 + GUARD_HOLD_MS)).toBe(true);
    expect(hold.release('shift', 2000 + GUARD_HOLD_MS + 500)).toBe(false);
    expect(hold.guarding(4000)).toBe(false);
  });

  it('holds until the last input lets go, and a lost focus lets go of all with no roll', () => {
    const hold = new DodgeHold();
    hold.press('shift', 0);
    hold.press('button', 50);
    expect(hold.release('shift', 100)).toBe(false);
    expect(hold.guarding(GUARD_HOLD_MS)).toBe(true);
    expect(hold.release('button', 400)).toBe(false);
    hold.press('mouse', 1000);
    hold.clear();
    expect(hold.guarding(2000)).toBe(false);
    expect(hold.release('mouse', 2000)).toBe(false);
  });
});
