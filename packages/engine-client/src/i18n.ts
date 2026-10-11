/**
 * The language of the page: English or Spanish (Fede's decision, 2026-10-11). The page chooses it
 * once, when it loads: `?lang=` (for tests; not kept), else the choice that the browser keeps
 * (localStorage `game.lang.v1`), else the language of the browser (Spanish when
 * `navigator.language` starts with `es`). A new choice reloads the page (saveLang()).
 *
 * The engine's texts are in a table for each language (ui/strings.ts, ui/strings-es.ts). A world's
 * texts are in English in its content; the world gives a table for each other language, from the
 * English text to the translation (WorldDefinition.texts), and tw() translates at the places where
 * the texts reach the screen.
 */

export const LANGS = ['en', 'es'] as const;
export type Lang = (typeof LANGS)[number];

/** The name of each language in that language: the choice shows them so. */
export const LANG_NAMES: Readonly<Record<Lang, string>> = { en: 'English', es: 'Español' };

const STORAGE_KEY = 'game.lang.v1';

/** The parts of a browser page that the choice reads: none in a test (Node). */
const page = globalThis as unknown as {
  readonly location?: { readonly search: string };
  readonly localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  readonly navigator?: { readonly language?: string };
};

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** The language of this page: `?lang=`, the kept choice, or the browser's. English without a browser (tests). */
export function pickLang(): Lang {
  try {
    const asked = new URLSearchParams(page.location?.search ?? '').get('lang');
    if (isLang(asked)) return asked;
  } catch {
    // A strange page: the next way.
  }
  try {
    const kept = page.localStorage?.getItem(STORAGE_KEY);
    if (isLang(kept)) return kept;
  } catch {
    // Blocked storage: the browser's language.
  }
  return page.navigator?.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** The language of this page, chosen when it loads. */
export const LANG: Lang = pickLang();

/** Keeps a new choice of language in the browser (the caller reloads the page). */
export function saveLang(lang: Lang): void {
  try {
    page.localStorage?.setItem(STORAGE_KEY, lang);
  } catch {
    // Blocked storage: the choice lasts until the reload only.
  }
}

let worldTexts: Readonly<Record<string, string>> = {};

/** The translations of the world's texts into the language of the page (WorldDefinition.texts), or none for English. */
export function setWorldTexts(table: Readonly<Record<string, string>> | undefined): void {
  worldTexts = table ?? {};
}

/** A text of the world in the language of the page: its translation, or the text itself (English, or a text of the engine). */
export function tw(text: string): string {
  return worldTexts[text] ?? text;
}
