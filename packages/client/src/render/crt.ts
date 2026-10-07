import { Filter, GlProgram, UniformGroup, defaultFilterVert } from 'pixi.js';

export interface CrtSettings {
  spread: number;
  mix: number;
  glow: number;
  scanline: number;
}

/**
 * The default settings of the CRT look: soft pixels, as on the screens that pixel art was made
 * for. Fede selected these values with the sliders on 2026-10-07 (?crt=0.6,1,1,0): full blur
 * and glow, no scanlines. The player can change them in the display settings
 * (settings-panel.ts).
 */
export const CRT_DEFAULTS: Readonly<CrtSettings> = {
  /** How far each game pixel bleeds into its neighbours, in game pixels (horizontal). */
  spread: 0.6,
  /** How much of the blurred image is mixed in (0 = sharp, 1 = all blur). */
  mix: 1,
  /** Strength of the halo round bright points (light glints, pale flowers, bones). */
  glow: 1,
  /** How much darker the border between two rows of game pixels is (0 = no scanlines). */
  scanline: 0,
};

/**
 * The CRT settings for text in the world (the speech bubble), which has a filter of its own.
 * Fede selected them on 2026-10-07 (?crt=0.3,0.5,0.5,0.3): less blur than the world, so the
 * letters stay readable, and strong scanlines. The sliders do not change them.
 */
export const CRT_TEXT: Readonly<CrtSettings> = {
  spread: 0.3,
  mix: 0.5,
  glow: 0.5,
  scanline: 0.3,
};

const fragment = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec4 uOutputFrame;

uniform float uPixel;
uniform vec2 uGrid;
uniform float uResolution;
uniform float uSpread;
uniform float uMix;
uniform float uGlow;
uniform float uScanline;

vec4 tap(vec2 offset) {
  vec2 uv = clamp(vTextureCoord + offset * uInputPixel.zw, uInputClamp.xy, uInputClamp.zw);
  return texture(uTexture, uv);
}

void main() {
  vec4 centre = texture(uTexture, vTextureCoord);

  // Diffusion: a small cross-shaped kernel, wider across than down, as a CRT beam spreads
  // along its line. (Diagonal taps changed almost nothing and cost 4 more reads per pixel.)
  float h = uSpread * uPixel;
  float v = 0.6 * h;
  vec4 blur = centre * 0.4
    + (tap(vec2(-h, 0.0)) + tap(vec2(h, 0.0))) * 0.18
    + (tap(vec2(0.0, -v)) + tap(vec2(0.0, v))) * 0.12;
  vec4 colour = mix(centre, blur, uMix);

  // Halo: a wider ring of samples, added only round bright points. The threshold is on
  // luminance, so the lit ground (dark, but large) does not glow and wash the picture out.
  vec4 wide = (tap(vec2(-3.0 * h, 0.0)) + tap(vec2(3.0 * h, 0.0)) + tap(vec2(0.0, -2.0 * h)) + tap(vec2(0.0, 2.0 * h))) * 0.25;
  float wideLuminance = dot(wide.rgb, vec3(0.3, 0.59, 0.11));
  colour.rgb += uGlow * wide.rgb * smoothstep(0.22, 0.5, wideLuminance);

  // Scanlines, on the rows of game pixels (not of device pixels), so they move with the world.
  // The dip is at the border between two rows; the division keeps the mean brightness.
  // The input texture starts at the top of the filter area, which is uOutputFrame.y (CSS
  // pixels) below the top of the screen: 0 for a full-screen filter, more for the text filter.
  float screenY = uOutputFrame.y * uResolution + vTextureCoord.y * uInputPixel.y;
  float row = fract((screenY - uGrid.y) / uPixel);
  float scan = 1.0 - uScanline * (0.5 + 0.5 * cos(6.2831853 * row));
  colour.rgb *= scan / (1.0 - 0.5 * uScanline);

  // The colours are premultiplied: colour must not exceed alpha.
  finalColor = vec4(min(colour.rgb, vec3(colour.a)), colour.a);
}
`;

/**
 * A full-screen post-processing filter for a CRT look: diffused pixels, a halo round bright
 * points and optional scanlines. It runs at the full device resolution, and it needs to know the size and
 * the position of the game-pixel grid, which change with the zoom and the camera.
 */
export class CrtFilter extends Filter {
  private readonly settings: UniformGroup<{
    uPixel: { value: number; type: 'f32' };
    uGrid: { value: Float32Array; type: 'vec2<f32>' };
    uSpread: { value: number; type: 'f32' };
    uMix: { value: number; type: 'f32' };
    uGlow: { value: number; type: 'f32' };
    uScanline: { value: number; type: 'f32' };
    uResolution: { value: number; type: 'f32' };
  }>;

  /**
   * `padding` (CSS pixels) is for a filter that covers only its container, not the screen: the
   * blur and the halo read pixels a little outside the container.
   */
  constructor(look: Readonly<CrtSettings> = CRT_DEFAULTS, padding = 0) {
    const settings = new UniformGroup({
      uPixel: { value: 1, type: 'f32' },
      uGrid: { value: new Float32Array(2), type: 'vec2<f32>' },
      uSpread: { value: look.spread, type: 'f32' },
      uMix: { value: look.mix, type: 'f32' },
      uGlow: { value: look.glow, type: 'f32' },
      uScanline: { value: look.scanline, type: 'f32' },
      uResolution: { value: 1, type: 'f32' },
    });
    super({
      // High precision: pixel coordinates go above 2048 on a phone, past what mediump can hold.
      glProgram: GlProgram.from({ vertex: defaultFilterVert, fragment, name: 'crt-filter', preferredFragmentPrecision: 'highp' }),
      resources: { crtSettings: settings },
      resolution: 'inherit',
      antialias: 'off',
      padding,
    });
    this.settings = settings;
  }

  /** Changes some of the settings. The next frame uses them. */
  set(look: Partial<CrtSettings>): void {
    const uniforms = this.settings.uniforms;
    if (look.spread !== undefined) uniforms.uSpread = look.spread;
    if (look.mix !== undefined) uniforms.uMix = look.mix;
    if (look.glow !== undefined) uniforms.uGlow = look.glow;
    if (look.scanline !== undefined) uniforms.uScanline = look.scanline;
  }

  /**
   * Sets the game-pixel grid: `zoom` device pixels for each game pixel, and the device-pixel
   * position of the world origin on the screen. `resolution` is the device pixel ratio.
   */
  setGrid(zoom: number, originX: number, originY: number, resolution: number): void {
    const uniforms = this.settings.uniforms;
    uniforms.uPixel = zoom;
    uniforms.uResolution = resolution;
    uniforms.uGrid[0] = ((originX % zoom) + zoom) % zoom;
    uniforms.uGrid[1] = ((originY % zoom) + zoom) % zoom;
  }
}
