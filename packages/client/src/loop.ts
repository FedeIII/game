/**
 * A fixed-timestep accumulator. The simulation always advances in steps of the same length,
 * whatever the frame rate is. The renderer uses `alpha` to interpolate between the last two
 * steps, so movement looks smooth on 60 Hz, 120 Hz and slow screens.
 */
export class FixedStep {
  private readonly step: number;
  private readonly tick: () => void;
  private accumulator = 0;

  constructor(step: number, tick: () => void) {
    this.step = step;
    this.tick = tick;
  }

  /** Runs all the steps that `seconds` of real time contain. */
  advance(seconds: number): void {
    // After a long pause (a hidden tab), do not run thousands of steps at once.
    this.accumulator += Math.min(seconds, 0.25);
    while (this.accumulator >= this.step) {
      this.tick();
      this.accumulator -= this.step;
    }
  }

  /** How far the current frame is between the previous step (0) and the last step (1). */
  get alpha(): number {
    return this.accumulator / this.step;
  }
}
