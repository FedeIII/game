import { MAX_CHARACTERS, NAME_MAX, characterSkin, type Character, type CharacterSheet } from '@game/engine';
import type { SkinStore } from '../skins/skin-store.ts';
import { STRINGS } from '../ui/strings.ts';
import { ApiError, api, type Me } from './api.ts';
import { CharacterBuilder } from './builder.ts';
import { el } from './dom.ts';
import { SkinPortrait } from './portrait.ts';

const T = STRINGS.menu;

export interface MenuOptions {
  /** The big title: the world's name. */
  readonly title: string;
  /** The small line under it: the site. */
  readonly site: string;
  /** The store that renders skins: the game goes on with it, so the chosen look is ready. */
  readonly skins: SkinStore;
}

/** The chosen character, and the name of the signed-in person. */
export interface MenuChoice {
  readonly character: Character;
  readonly account: string;
}

/** "3 days ago", "yesterday". */
function ago(ms: number): string {
  const seconds = (ms - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 86400],
    ['month', 30 * 86400],
    ['week', 7 * 86400],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  return format.format(0, 'minute');
}

/** The Google "G", in its colours (Google's sign-in guidelines ask for it on the button). */
function googleMark(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  const paths: [string, string][] = [
    ['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
    ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
    ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
    ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'],
  ];
  for (const [fill, d] of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', fill);
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/**
 * The menu before the game, over the whole page: sign in (with Google; in development also with
 * only a name), then "New game" (the character builder) or "Continue" (a character of the
 * account). It resolves with the character to play, and then it leaves the page.
 */
export function runMenu(options: MenuOptions): Promise<MenuChoice> {
  return new Promise((resolve) => {
    const root = el('div', { id: 'menu' });
    const screen = el('div', { class: 'menu-body' });
    const status = el('p', { class: 'menu-status', role: 'status', 'aria-live': 'polite' });
    const panel = el(
      'main',
      { class: 'menu-panel' },
      el('header', { class: 'menu-head' }, el('h1', { class: 'menu-name' }, options.title), el('p', { class: 'menu-site' }, options.site)),
      screen,
      status,
    );
    root.append(panel);
    document.body.append(root);

    let me: Me | null = null;
    let characters: Character[] = [];
    let builder: CharacterBuilder | null = null;
    const portraits: SkinPortrait[] = [];

    // A sign-in that came back from Google with a result in the URL: say it once, then clean the URL.
    const params = new URLSearchParams(location.search);
    const login = params.get('login');
    if (login) {
      params.delete('login');
      history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`);
    }
    let notice = login === 'failed' ? T.loginFailed : login === 'cancelled' ? T.loginCancelled : '';

    const say = (text: string) => {
      status.textContent = text;
    };
    const show = (...children: HTMLElement[]) => {
      for (const portrait of portraits.splice(0)) portrait.stop();
      if (builder && !children.includes(builder.element)) {
        builder.stop();
        builder = null;
      }
      screen.replaceChildren(...children);
      say(notice);
      notice = '';
      // The first heading of a screen takes the focus: a screen reader says where the visitor is.
      (screen.querySelector('[tabindex="-1"]') as HTMLElement | null)?.focus();
    };
    const fail = (error: unknown, retry: () => void) => {
      const text = error instanceof ApiError && (error.status === 0 || error.status >= 500) ? T.serverDown : T.failed;
      const again = el('button', { type: 'button', class: 'menu-button menu-primary' }, T.retry);
      again.addEventListener('click', retry);
      show(el('section', { class: 'menu-screen' }, el('h2', { class: 'menu-title', tabindex: '-1' }, text), el('div', { class: 'menu-actions' }, again)));
    };
    const loading = (text: string = T.loading) => show(el('section', { class: 'menu-screen' }, el('p', { class: 'menu-title', tabindex: '-1' }, text)));

    const start = async (character: Character) => {
      loading(T.starting);
      try {
        const played = await api.play(character.id);
        // The look of the character first: the game wears it at once.
        options.skins.get(characterSkin(played), undefined, true);
        root.classList.add('leaving');
        setTimeout(() => root.remove(), 400);
        resolve({ character: played, account: me?.user?.name ?? '' });
      } catch (error) {
        fail(error, () => void start(character));
      }
    };

    // ---------------------------------------------------------------- screens

    const signIn = () => {
      const parts: HTMLElement[] = [el('h2', { class: 'menu-title', tabindex: '-1' }, T.signInTitle)];
      if (me?.login.google) {
        const google = el('button', { type: 'button', class: 'menu-button google' }, googleMark(), el('span', {}, T.google));
        google.addEventListener('click', () => {
          google.disabled = true;
          api.signInWithGoogle();
        });
        parts.push(el('div', { class: 'menu-actions menu-stack' }, google));
      }
      if (me?.login.dev) {
        const input = el('input', { type: 'text', id: 'dev-name', maxlength: String(NAME_MAX), autocomplete: 'off', spellcheck: 'false', placeholder: T.devName });
        const go = el('button', { type: 'submit', class: 'menu-button' }, T.devSignIn);
        const form = el('form', { class: 'dev-sign-in' }, el('label', { for: 'dev-name', class: 'sr-only' }, T.devName), input, go);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (!input.value.trim()) return input.focus();
          go.disabled = true;
          api.devSignIn(input.value).then(home, (error: unknown) => fail(error, () => void home()));
        });
        parts.push(form);
      }
      if (!me?.login.google && !me?.login.dev) parts.push(el('p', { class: 'menu-hint' }, T.noSignIn));
      show(el('section', { class: 'menu-screen' }, ...parts));
    };

    const main = () => {
      const newGame = el('button', { type: 'button', class: 'menu-button menu-primary' }, T.newGame);
      newGame.addEventListener('click', create);
      const resume = el('button', { type: 'button', class: 'menu-button' }, T.continue);
      resume.disabled = characters.length === 0;
      resume.addEventListener('click', pickCharacter);
      const out = el('button', { type: 'button', class: 'menu-link' }, T.signOut);
      out.addEventListener('click', () => {
        out.disabled = true;
        api.signOut().then(home, (error: unknown) => fail(error, () => void home()));
      });
      show(
        el(
          'section',
          { class: 'menu-screen menu-main' },
          el('h2', { class: 'sr-only', tabindex: '-1' }, options.title),
          el('div', { class: 'menu-actions menu-stack' }, newGame, resume),
          el('p', { class: 'menu-account' }, T.signedInAs(me?.user?.name || me?.user?.email || '?'), ' · ', out),
        ),
      );
      newGame.focus();
    };

    const create = () => {
      if (characters.length >= MAX_CHARACTERS) {
        notice = T.limit(MAX_CHARACTERS);
        return pickCharacter();
      }
      const made = new CharacterBuilder(options.skins, {
        back: main,
        create: (sheet: CharacterSheet) => {
          made.setBusy(T.creating);
          api.create(sheet).then(
            (character) => void start(character),
            (error: unknown) => {
              made.setBusy(null);
              say(error instanceof ApiError && error.message === 'limit' ? T.limit(MAX_CHARACTERS) : error instanceof ApiError && error.status === 0 ? T.serverDown : T.failed);
            },
          );
        },
      });
      show(made.element);
      builder = made;
      made.focusTitle();
    };

    const pickCharacter = () => {
      const back = el('button', { type: 'button', class: 'menu-button' }, T.back);
      back.addEventListener('click', main);
      const list = el('ul', { class: 'character-list' });
      for (const character of characters) {
        const portrait = new SkinPortrait(options.skins, 2, false);
        portrait.show(characterSkin(character));
        portraits.push(portrait);
        const race = STRINGS.races[character.race].name;
        const cls = STRINGS.classes[character.class].name;
        const when = character.playedAt ? T.lastPlayed(ago(character.playedAt)) : T.created(ago(character.createdAt));
        const play = el(
          'button',
          { type: 'button', class: 'character-play' },
          portrait.element,
          el('span', { class: 'character-text' }, el('span', { class: 'character-name' }, character.name), el('span', { class: 'character-kind' }, `${race} ${cls.toLowerCase()}`), el('span', { class: 'character-when' }, when)),
        );
        play.addEventListener('click', () => void start(character));
        const remove = el('button', { type: 'button', class: 'menu-small character-delete', 'aria-label': `${T.delete} ${character.name}` }, T.delete);
        const item = el('li', { class: 'character' }, play, remove);
        remove.addEventListener('click', () => {
          const yes = el('button', { type: 'button', class: 'menu-small danger' }, T.delete);
          const no = el('button', { type: 'button', class: 'menu-small' }, T.keep);
          const ask = el('div', { class: 'character-ask', role: 'alertdialog', 'aria-label': T.deleteAsk(character.name) }, el('span', {}, T.deleteAsk(character.name)), yes, no);
          no.addEventListener('click', () => {
            ask.replaceWith(remove);
            remove.focus();
          });
          yes.addEventListener('click', () => {
            yes.disabled = true;
            api.remove(character.id).then(
              () => {
                characters = characters.filter((c) => c.id !== character.id);
                if (characters.length) pickCharacter();
                else main();
              },
              (error: unknown) => fail(error, pickCharacter),
            );
          });
          remove.replaceWith(ask);
          no.focus();
        });
        list.append(item);
      }
      show(
        el(
          'section',
          { class: 'menu-screen' },
          el('h2', { class: 'menu-title', tabindex: '-1' }, T.continueTitle),
          characters.length ? list : el('p', { class: 'menu-hint' }, T.noCharacters),
          el('div', { class: 'menu-actions' }, back),
        ),
      );
    };

    /** Asks the server who is signed in, and shows the sign-in or the main screen. */
    const home = async () => {
      loading();
      try {
        me = await api.me();
        if (!me.user) return signIn();
        characters = await api.characters();
        main();
      } catch (error) {
        fail(error, () => void home());
      }
    };

    // Escape goes back from the builder and from the list.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !me?.user) return;
      if (builder || screen.querySelector('.character-list')) main();
    });

    void home();
  });
}
