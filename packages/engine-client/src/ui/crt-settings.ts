import { CRT_DEFAULTS, type CrtFilter, type CrtSettings } from '../render/crt.ts';
import { STRINGS } from './strings.ts';

interface Slider {
  readonly key: keyof CrtSettings;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * The sliders, in the order of the ?crt= values. The ranges are the useful ones: above a spread
 * of 1 the 5-tap blur skips pixels and edges show a double image.
 */
export const SLIDERS: readonly Slider[] = [
  { key: 'spread', label: STRINGS.settings.spread, min: 0, max: 1, step: 0.05 },
  { key: 'mix', label: STRINGS.settings.mix, min: 0, max: 1, step: 0.05 },
  { key: 'glow', label: STRINGS.settings.glow, min: 0, max: 1, step: 0.05 },
  { key: 'scanline', label: STRINGS.settings.scanline, min: 0, max: 0.5, step: 0.01 },
];

export interface CrtState {
  enabled: boolean;
  values: CrtSettings;
}

/**
 * Where this browser keeps the settings. v2 since the new defaults of 2026-10-12: a browser that saved
 * the old ones gets the new ones once.
 */
const STORAGE_KEY = 'game.crt.v2';

function clamp(value: number, slider: Slider): number {
  return Math.min(slider.max, Math.max(slider.min, value));
}

/**
 * The CRT state at start-up: the defaults, then the settings that this browser saved, then the
 * URL (?nocrt, and ?crt=spread,mix,glow,scanline where an empty value keeps the one before).
 * The URL wins, so a shared link shows what its sender saw.
 */
export function crtStateFrom(params: URLSearchParams, saved: unknown): CrtState {
  const state: CrtState = { enabled: true, values: { ...CRT_DEFAULTS } };
  if (saved && typeof saved === 'object') {
    const { enabled, values } = saved as { enabled?: unknown; values?: Record<string, unknown> };
    if (typeof enabled === 'boolean') state.enabled = enabled;
    for (const slider of SLIDERS) {
      const value = values?.[slider.key];
      if (typeof value === 'number' && Number.isFinite(value)) state.values[slider.key] = clamp(value, slider);
    }
  }
  const fromUrl = (params.get('crt') ?? '').split(',');
  SLIDERS.forEach((slider, i) => {
    const value = Number.parseFloat(fromUrl[i] ?? '');
    if (Number.isFinite(value)) state.values[slider.key] = clamp(value, slider);
  });
  if (params.has('nocrt')) state.enabled = false;
  return state;
}

/** Reads the saved settings. Storage can be absent or blocked (private mode); then there are none. */
export function loadSavedCrt(): unknown {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function saveCrt(state: CrtState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is blocked: the settings last until the page closes.
  }
}

/** The settings as the ?crt= value, for example "0.25,1,1,0.1". */
export function crtQuery(values: CrtSettings): string {
  return SLIDERS.map((slider) => String(Number(values[slider.key].toFixed(2)))).join(',');
}

/**
 * The display settings: an on/off switch for the CRT effect, a slider for each setting, the ?crt=
 * value with "Copy link", and "Reset". Each change goes to `apply` and is saved in this browser. The
 * settings of the game menu show it (to an admin), and so does the settings screen of the menu.
 */
export class CrtControls {
  readonly element: HTMLElement;
  private readonly state: CrtState;
  private readonly apply: (state: CrtState) => void;
  private readonly toggle: HTMLInputElement;
  private readonly inputs = new Map<keyof CrtSettings, { input: HTMLInputElement; output: HTMLOutputElement }>();
  private readonly query: HTMLElement;
  private readonly copy: HTMLButtonElement;

  constructor(state: CrtState, apply: (state: CrtState) => void) {
    this.state = state;
    this.apply = apply;
    this.element = document.createElement('div');
    this.element.className = 'settings-display';
    const title = document.createElement('label');
    title.className = 'settings-title';
    this.toggle = document.createElement('input');
    this.toggle.type = 'checkbox';
    title.append(this.toggle, ` ${STRINGS.settings.crt}`);
    this.element.append(title);

    for (const slider of SLIDERS) {
      const row = document.createElement('label');
      row.className = 'settings-row';
      const name = document.createElement('span');
      name.textContent = slider.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(slider.min);
      input.max = String(slider.max);
      input.step = String(slider.step);
      const output = document.createElement('output');
      row.append(name, input, output);
      this.element.append(row);
      this.inputs.set(slider.key, { input, output });
      input.addEventListener('input', () => {
        this.state.values[slider.key] = Number(input.value);
        this.changed();
      });
    }

    const footer = document.createElement('div');
    footer.className = 'settings-footer';
    this.query = document.createElement('code');
    this.copy = this.smallButton(STRINGS.settings.copyLink, () => void this.copyLink());
    footer.append(this.query, this.copy, this.smallButton(STRINGS.settings.reset, () => this.reset()));
    this.element.append(footer);

    this.toggle.addEventListener('change', () => {
      this.state.enabled = this.toggle.checked;
      this.changed();
    });
    this.sync();
  }

  private smallButton(text: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-small';
    button.textContent = text;
    button.addEventListener('click', action);
    return button;
  }

  /** Puts the state into the controls. */
  private sync(): void {
    this.toggle.checked = this.state.enabled;
    for (const slider of SLIDERS) {
      const { input, output } = this.inputs.get(slider.key)!;
      input.value = String(this.state.values[slider.key]);
      input.disabled = !this.state.enabled;
      output.value = this.state.values[slider.key].toFixed(2);
    }
    this.query.textContent = this.state.enabled ? `?crt=${crtQuery(this.state.values)}` : '?nocrt';
  }

  private changed(): void {
    this.sync();
    saveCrt(this.state);
    this.apply(this.state);
  }

  private reset(): void {
    this.state.enabled = true;
    this.state.values = { ...CRT_DEFAULTS };
    this.changed();
  }

  /** Copies a link to the game with these settings, to send to someone. */
  private async copyLink(): Promise<void> {
    const url = `${location.origin}${location.pathname}${this.query.textContent}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copy.textContent = STRINGS.settings.copied;
    } catch {
      this.copy.textContent = STRINGS.settings.copyFailed;
    }
    setTimeout(() => (this.copy.textContent = STRINGS.settings.copyLink), 1500);
  }
}

/**
 * The filters take the state: the switch for all of them, the values for the world's filter only
 * (`linked`: the text filter, which has fixed settings).
 */
export function applyCrt(state: CrtState, crt: CrtFilter, linked: readonly CrtFilter[] = []): void {
  for (const filter of [crt, ...linked]) filter.enabled = state.enabled;
  crt.set(state.values);
}
