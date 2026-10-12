import { audio } from '../audio/audio.ts';
import { STRINGS } from './strings.ts';

/**
 * The "Sound" section of the settings panel (2026-10-12): a slider for the music, one for the
 * effects (and the sounds of the places), and a box that mutes everything. The engine keeps the
 * values (audio/settings.ts, localStorage), and every control that shows them follows a change.
 */
export function soundSection(): HTMLElement {
  const T = STRINGS.sound;
  const section = document.createElement('div');
  section.className = 'settings-sound';
  const heading = document.createElement('p');
  heading.className = 'settings-heading';
  heading.textContent = T.heading;
  section.append(heading);
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
