import { LANG, LANGS, LANG_NAMES, saveLang, type Lang } from '../i18n.ts';
import { STRINGS } from './strings.ts';

/**
 * The choice of the language: "English · Español", each in its own language. The language of the
 * page shows as text; a press on the other one keeps it (saveLang) and calls `chosen`, which
 * reloads the page. The menu shows it under its screens, the settings of both menus in a section.
 */
export function languageChoice(className: string, chosen: (lang: Lang) => void): HTMLElement {
  const box = document.createElement('p');
  box.className = className;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', STRINGS.settings.language);
  LANGS.forEach((lang, i) => {
    if (i > 0) box.append(' · ');
    if (lang === LANG) {
      const current = document.createElement('span');
      current.className = 'lang-current';
      current.lang = lang;
      current.setAttribute('aria-current', 'true');
      current.textContent = LANG_NAMES[lang];
      box.append(current);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-link lang-choice-other';
    button.lang = lang;
    button.dataset.lang = lang;
    button.textContent = LANG_NAMES[lang];
    button.addEventListener('click', () => {
      button.disabled = true;
      saveLang(lang);
      chosen(lang);
    });
    box.append(button);
  });
  return box;
}
