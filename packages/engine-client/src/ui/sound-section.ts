import { audio } from '../audio/audio.ts';
import { SOUND_CREDITS } from '../audio/samples.ts';
import { STRINGS } from './strings.ts';

/**
 * The "Sound" section of the settings of the game menu (2026-10-12; in a settings panel until
 * 2026-10-14) and of the menu's settings (2026-10-13): a
 * slider for the music, one for the effects (and the sounds of the places), and a box that mutes
 * everything. The engine keeps the values (audio/settings.ts, localStorage), and every control that
 * shows them follows a change. Without `heading`, the page gives the section its own heading.
 */
export function soundSection(heading = true): HTMLElement {
  const T = STRINGS.sound;
  const section = document.createElement('div');
  section.className = 'settings-sound';
  if (heading) {
    const title = document.createElement('p');
    title.className = 'settings-heading';
    title.textContent = T.heading;
    section.append(title);
  }
  const sliders = (['music', 'effects'] as const).map((key) => {
    const row = document.createElement('label');
    row.className = 'settings-row';
    const name = document.createElement('span');
    name.textContent = T[key];
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.step = '5';
    const output = document.createElement('output');
    row.append(name, input, output);
    section.append(row);
    input.addEventListener('input', () => {
      audio.resume();
      audio.setSettings({ ...audio.settings, [key]: Number(input.value) / 100 });
    });
    return { key, input, output };
  });
  const mute = document.createElement('label');
  mute.className = 'settings-title';
  const box = document.createElement('input');
  box.type = 'checkbox';
  mute.append(box, ` ${T.mute}`);
  section.append(mute);
  box.addEventListener('change', () => audio.setSettings({ ...audio.settings, muted: box.checked }));
  // The credits of the recordings (the choir's licence, CC BY, asks for them).
  const credits = document.createElement('p');
  credits.className = 'settings-credits';
  credits.textContent = `${T.credits} ${SOUND_CREDITS.join('; ')}.`;
  section.append(credits);
  const show = () => {
    const s = audio.settings;
    for (const { key, input, output } of sliders) {
      input.value = String(Math.round(s[key] * 100));
      output.textContent = `${Math.round(s[key] * 100)}%`;
      input.disabled = s.muted;
    }
    box.checked = s.muted;
  };
  show();
  audio.onSettings(show);
  return section;
}

/** A speaker, with waves (sound on) or a cross (sound off). */
const speaker = (on: boolean) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/>${
    on ? '<path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M17.8 7.2a6.8 6.8 0 0 1 0 9.6"/>' : '<path d="M16 9.5l5 5M21 9.5l-5 5"/>'
  }</svg>`;

/**
 * A button with a speaker that mutes and unmutes all the sound of the game (the setting "Mute all"):
 * the prologue's and the menu's. A toggle keeps its name ("Sound"); aria-pressed says the state, the
 * tooltip says it in words. `stop` ends its link to the settings.
 */
export function soundToggle(className: string): { readonly element: HTMLButtonElement; readonly stop: () => void } {
  const T = STRINGS.sound;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  const show = () => {
    const on = !audio.settings.muted;
    button.innerHTML = speaker(on);
    button.setAttribute('aria-label', T.heading);
    button.setAttribute('aria-pressed', String(on));
    button.title = on ? T.on : T.off;
  };
  show();
  button.addEventListener('click', () => {
    audio.resume();
    audio.setSettings({ ...audio.settings, muted: !audio.settings.muted });
  });
  return { element: button, stop: audio.onSettings(show) };
}
