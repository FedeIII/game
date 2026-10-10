import { CRT_DEFAULTS, type CrtFilter, type CrtSettings } from '../render/crt.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';

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
  { key: 'spread', label: 'Spread', min: 0, max: 1, step: 0.05 },
  { key: 'mix', label: 'Blur', min: 0, max: 1, step: 0.05 },
  { key: 'glow', label: 'Glow', min: 0, max: 1, step: 0.05 },
  { key: 'scanline', label: 'Scanlines', min: 0, max: 0.5, step: 0.01 },
];

export interface CrtState {
  enabled: boolean;
  values: CrtSettings;
}

const STORAGE_KEY = 'game.crt.v1';

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

/** The settings as the ?crt= value, for example "0.6,1,1,0". */
export function crtQuery(values: CrtSettings): string {
  return SLIDERS.map((slider) => String(Number(values[slider.key].toFixed(2)))).join(',');
}

const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`;

/**
 * The settings: a button in the top-right corner opens a panel. It has the sections that the game
 * adds on top (addSection: the visitor's look and name), and for an admin the display settings (an
 * on/off switch and a slider for each CRT setting). Changes apply at once and are saved in this
 * browser. The panel is outside the game surface, so a touch on it never moves the player.
 */
export class SettingsPanel {
  private readonly crt: CrtFilter;
  /** Filters that follow the on/off switch only (the text filter has fixed settings). */
  private readonly linked: readonly CrtFilter[];
  private readonly state: CrtState;
  private readonly panel: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly toggle: HTMLInputElement;
  private readonly inputs = new Map<keyof CrtSettings, { input: HTMLInputElement; output: HTMLOutputElement }>();
  private readonly query: HTMLElement;
  private readonly copy: HTMLButtonElement;

  /** `controls`: the display settings show (an admin). Without them, the filters keep `state`. */
  constructor(crt: CrtFilter, state: CrtState, linked: readonly CrtFilter[] = [], controls = true) {
    this.crt = crt;
    this.linked = linked;
    this.state = state;

    this.button = document.createElement('button');
    this.button.id = 'settings-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Settings');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'settings');
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'settings';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Settings');

    // The display settings: in the panel only for an admin.
    const display = document.createDocumentFragment();
    const title = document.createElement('label');
    title.className = 'settings-title';
    this.toggle = document.createElement('input');
    this.toggle.type = 'checkbox';
    title.append(this.toggle, ' CRT effect');
    display.append(title);

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
      display.append(row);
      this.inputs.set(slider.key, { input, output });
      input.addEventListener('input', () => {
        this.state.values[slider.key] = Number(input.value);
        this.crt.set({ [slider.key]: this.state.values[slider.key] });
        this.changed();
      });
    }

    const footer = document.createElement('div');
    footer.className = 'settings-footer';
    this.query = document.createElement('code');
    this.copy = this.smallButton('Copy link', () => void this.copyLink());
    footer.append(this.query, this.copy, this.smallButton('Reset', () => this.reset()));
    display.append(footer);
    if (controls) this.panel.append(display);

    this.toggle.addEventListener('change', () => {
      this.state.enabled = this.toggle.checked;
      this.applyEnabled();
      this.changed();
    });
    this.button.addEventListener('click', () => this.show(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.show(false);
    });
    onOtherPanelOpen('settings', () => this.show(false));
    // Give the focus back after a click or a drag on a control, so WASD moves the player again
    // at once: keyboard.ts ignores keys typed into a form field. The focus moves at the click
    // (for a checkbox in a label, after pointerup), so blur after the click is done.
    this.panel.addEventListener('click', () => {
      setTimeout(() => {
        const focused = document.activeElement;
        // Not a text field: the visitor is about to type in it.
        const typing = focused instanceof HTMLInputElement && focused.type === 'text';
        if (focused instanceof HTMLElement && this.panel.contains(focused) && !typing) focused.blur();
      }, 0);
    });

    document.body.append(this.button, this.panel);
    this.applyEnabled();
    this.crt.set(state.values);
    this.sync();
  }

  /** Puts a section at the top of the panel, over the display settings. */
  addSection(section: HTMLElement): void {
    this.panel.prepend(section);
  }

  private applyEnabled(): void {
    for (const filter of [this.crt, ...this.linked]) filter.enabled = this.state.enabled;
  }

  private smallButton(text: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-small';
    button.textContent = text;
    button.addEventListener('click', action);
    return button;
  }

  private show(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) announceOpenPanel('settings');
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
  }

  private reset(): void {
    this.state.enabled = true;
    this.state.values = { ...CRT_DEFAULTS };
    this.applyEnabled();
    this.crt.set(this.state.values);
    this.changed();
  }

  /** Copies a link to the game with these settings, to send to someone. */
  private async copyLink(): Promise<void> {
    const url = `${location.origin}${location.pathname}${this.query.textContent}`;
    try {
      await navigator.clipboard.writeText(url);
      this.copy.textContent = 'Copied';
    } catch {
      this.copy.textContent = 'Copy failed';
    }
    setTimeout(() => (this.copy.textContent = 'Copy link'), 1500);
  }
}
