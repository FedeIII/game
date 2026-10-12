/**
 * The sound settings of a visitor (audio/audio.ts): the volume of the music and of the effects (0 to
 * 1), and whether the game is muted. They are kept in localStorage (`game.audio.v1`); a page without
 * storage uses the defaults.
 */

export interface SoundSettings {
  readonly music: number;
  readonly effects: number;
  readonly muted: boolean;
}

export const DEFAULT_SOUND: SoundSettings = { music: 0.6, effects: 0.8, muted: false };

export const SOUND_KEY = 'game.audio.v1';

/** Settings from a stored text: each value checked, the default where one is missing or bad. */
export function parseSound(raw: string | null): SoundSettings {
  if (!raw) return DEFAULT_SOUND;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const level = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : d);
    return { music: level(v.music, DEFAULT_SOUND.music), effects: level(v.effects, DEFAULT_SOUND.effects), muted: v.muted === true };
  } catch {
    return DEFAULT_SOUND;
  }
}

export function loadSound(): SoundSettings {
  try {
    return parseSound(localStorage.getItem(SOUND_KEY));
  } catch {
    return DEFAULT_SOUND;
  }
}

export function saveSound(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(settings));
  } catch {
    // No storage: the settings last as long as the page.
  }
}
