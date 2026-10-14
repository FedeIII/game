import { SNEAK_SPEED, clampInput, isSneaking, type MoveInput } from '@game/engine';

/**
 * The sneak walk of C: while it is on, the keys and the joystick walk at SNEAK_SPEED. C turns it on
 * and off, and an attack turns it off (Fede, 2026-10-14): the player leaves the sneak and stands up.
 * A small push of the joystick is a slow walk without it, so that push still sneaks after an attack.
 */
export class SneakWalk {
  private walk = false;

  /** Whether the sneak walk is on. */
  get on(): boolean {
    return this.walk;
  }

  /** The C key. */
  toggle(): void {
    this.walk = !this.walk;
  }

  /** An attack starts: the sneak walk ends. */
  attack(): void {
    this.walk = false;
  }

  /** The input of the keys and the joystick, at SNEAK_SPEED while the sneak walk is on. */
  input(keys: MoveInput, stick: MoveInput): MoveInput {
    const scale = this.walk ? SNEAK_SPEED : 1;
    return clampInput({ x: (keys.x + stick.x) * scale, y: (keys.y + stick.y) * scale });
  }

  /**
   * Whether the player sneaks on purpose: the sneak walk, a slow walk, or the crouch after one
   * (`crouched`: PlayerView.crouched). Standing still also hides it from mobs, but not on purpose.
   */
  shown(player: Parameters<typeof isSneaking>[0], crouched: boolean): boolean {
    return isSneaking(player) && (this.walk || Math.hypot(player.vx, player.vy) > 1 || crouched);
  }
}

