import { MAX_CHARACTERS, NAME_MAX, type Character, type CharacterSheet } from '@game/engine';
import { LANG } from '../i18n.ts';
import { languageChoice } from '../ui/language-choice.ts';
import { prologueSeen } from '../ui/prologue.ts';
import { CrtControls, crtStateFrom, loadSavedCrt } from '../ui/settings-panel.ts';
import { soundSection, soundToggle } from '../ui/sound-section.ts';
import { tipsControls } from '../ui/tips.ts';
import { characterLook } from '../skins/look.ts';
import type { SkinStore } from '../skins/skin-store.ts';
import { STRINGS } from '../ui/strings.ts';
import { ApiError, api, type Me } from './api.ts';
import { CharacterBuilder } from './builder.ts';
import { el } from './dom.ts';
import { MenuLogo } from './logo.ts';
import { SkinPortrait } from './portrait.ts';
import { takeMenuScreen, takeResume } from './resume.ts';
import { MenuSounds } from './sounds.ts';

const T = STRINGS.menu;

/** The picture behind the menu (art/menu-art.ts, made by `npm run art`). */
const BACKDROP_URL = Object.values(import.meta.glob('../generated/menu.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)[0];

/**
 * The picture behind the menu: Nivalia at sunset, in pixel art. It covers the page at a whole scale,
 * so its pixels stay sharp (a narrow screen shows its middle), and it fades in once it is loaded.
 * Returns the element and a function that stops it.
 */
function backdrop(): { element: HTMLElement; stop: () => void } {
  const element = el('div', { class: 'menu-backdrop', 'aria-hidden': 'true' });
  if (!BACKDROP_URL) return { element, stop: () => {} };
  const picture = new Image();
  picture.src = BACKDROP_URL;
  const cover = () => {
    if (!picture.naturalWidth) return;
    const scale = Math.max(1, Math.ceil(Math.max(innerWidth / picture.naturalWidth, innerHeight / picture.naturalHeight)));
    element.style.backgroundSize = `${picture.naturalWidth * scale}px ${picture.naturalHeight * scale}px`;
  };
  picture.decode().then(
    () => {
      element.style.backgroundImage = `url(${BACKDROP_URL})`;
      cover();
      element.classList.add('shown');
    },
    () => {},
  );
  window.addEventListener('resize', cover);
  return { element, stop: () => window.removeEventListener('resize', cover) };
}

/**
 * How a screen of the menu shows: `open`, the logo at the top and the screen at the bottom over the
 * picture, with no box (the sign-in, the main screen, and the short screens: loading, a failure); or
 * `panel`, a smaller logo over a panel that holds the screen (the builder, the list, the settings).
 */
type Layout = 'open' | 'panel';

export interface MenuOptions {
  /** The big title: the game's name (the logo shows it). */
  readonly title: string;
  /** The small line under it: the site. */
  readonly site: string;
  /** The store that renders skins: the game goes on with it, so the chosen look is ready. */
  readonly skins: SkinStore;
  /**
   * Plays the world's prologue over the menu, for the character played last (or none). The main
   * screen offers it once this browser saw the prologue (it plays first after "Create").
   */
  readonly prologue?: (latest: Character | null) => Promise<void>;
}

/** The chosen character, if the account is an admin, and if the character was just made (its prologue plays). */
export interface MenuChoice {
  readonly character: Character;
  readonly admin: boolean;
  readonly fresh: boolean;
}

/** "3 days ago", "yesterday". */
function ago(ms: number): string {
  const seconds = (ms - Date.now()) / 1000;
  const format = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' });
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

/** A key or a button of the controls, as a small plate. */
function key(name: string): HTMLElement {
  return el('kbd', { class: 'menu-key' }, name);
}

/** The controls of the game, to read: what each one does, its keys, and what a touch screen has instead. */
function controlList(): HTMLElement {
  const list = el('dl', { class: 'control-list' });
  for (const control of T.controlList) {
    const keys = el('dd', { class: 'control-keys' });
    control.keys.forEach((choice, i) => {
      if (i > 0) keys.append(` ${T.or} `);
      const group = el('span', { class: 'control-choice' });
      choice.forEach((name, k) => {
        if (k > 0) group.append(' ');
        group.append(key(name));
      });
      keys.append(group);
    });
    const row = el('div', { class: 'control' }, el('dt', {}, control.action), keys);
    if (control.note) row.append(el('dd', { class: 'control-note' }, control.note));
    row.append(el('dd', { class: 'control-touch' }, `${T.touch}: ${control.touch}`));
    list.append(row);
  }
  return list;
}

/** The privacy page (apps/game/public/privacy/), in a new tab: the menu stays as it is. */
function privacyLink(): HTMLAnchorElement {
  return el('a', { href: LANG === 'es' ? '/privacy/es/' : '/privacy/', target: '_blank', rel: 'noopener', class: 'menu-link' }, T.privacy);
}

/**
 * The menu before the game, over the whole page: sign in (with Google; in development also with
 * only a name), then "New game" (the character builder) or "Continue" (a character of the
 * account). It resolves with the character to play, and then it leaves the page. The logo of the
 * game is at the top (menu/logo.ts; see `Layout`). It has music and sounds (menu/sounds.ts), and a
 * speaker at the top right turns all the sound on and off.
 */
export function runMenu(options: MenuOptions): Promise<MenuChoice> {
  return new Promise((resolve) => {
    const root = el('div', { id: 'menu' });
    const screen = el('div', { class: 'menu-body' });
    const status = el('p', { class: 'menu-status', role: 'status', 'aria-live': 'polite' });
    const logo = new MenuLogo(options.title);
    const frame = el(
      'main',
      { class: 'menu-frame' },
      el('header', { class: 'menu-head' }, logo.element),
      el('div', { class: 'menu-panel' }, screen, status),
      el('p', { class: 'menu-site' }, options.site),
    );
    const picture = backdrop();
    const speaker = soundToggle('menu-sound');
    root.append(picture.element, frame, speaker.element);
    document.body.append(root);
    const sounds = new MenuSounds(root);

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
    let notice = login === 'failed' ? T.loginFailed : login === 'cancelled' ? T.loginCancelled : login === 'elsewhere' ? T.loginElsewhere : '';

    const say = (text: string) => {
      status.textContent = text;
    };
    /** Puts a screen in the menu, in its layout. */
    const place = (layout: Layout, ...children: HTMLElement[]) => {
      root.classList.toggle('menu-open', layout === 'open');
      logo.setOpen(layout === 'open');
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
    /** A new screen: it comes with a rustle. */
    const show = (layout: Layout, ...children: HTMLElement[]) => {
      place(layout, ...children);
      sounds.screen();
    };
    const fail = (error: unknown, retry: () => void) => {
      const text = error instanceof ApiError && (error.status === 0 || error.status >= 500) ? T.serverDown : T.failed;
      const again = el('button', { type: 'button', class: 'menu-button menu-primary' }, T.retry);
      again.addEventListener('click', retry);
      show('open', el('section', { class: 'menu-screen' }, el('h2', { class: 'menu-title', tabindex: '-1' }, text), el('div', { class: 'menu-actions' }, again)));
    };
    const loading = (text: string = T.loading) => {
      // A notice (a sign-in that failed, a session that ended) waits for the screen after this one.
      const waiting = notice;
      place('open', el('section', { class: 'menu-screen' }, el('p', { class: 'menu-title', tabindex: '-1' }, text)));
      notice = waiting;
    };

    const start = async (character: Character, fresh = false) => {
      loading(T.starting);
      try {
        const played = await api.play(character.id);
        // The look of the character first: the game wears it at once.
        options.skins.get(characterLook(played), undefined, true);
        // The music goes on: the prologue of a new character goes on with it, and the game's music
        // takes its place with a crossfade.
        root.classList.add('leaving');
        picture.stop();
        logo.stop();
        speaker.stop();
        setTimeout(() => root.remove(), 400);
        resolve({ character: played, admin: me?.user?.admin === true, fresh });
      } catch (error) {
        fail(error, () => void start(character, fresh));
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
        // A name, or an email (it signs in with that email, as Google would: ADMIN_EMAILS).
        const input = el('input', { type: 'text', id: 'dev-name', maxlength: String(4 * NAME_MAX), autocomplete: 'off', spellcheck: 'false', placeholder: T.devName });
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
      parts.push(el('p', { class: 'menu-account' }, privacyLink()));
      parts.push(languageChoice('menu-account lang-choice', () => location.reload()));
      show('open', el('section', { class: 'menu-screen' }, ...parts));
    };

    const main = () => {
      const newGame = el('button', { type: 'button', class: 'menu-button menu-primary' }, T.newGame);
      newGame.addEventListener('click', create);
      const resume = el('button', { type: 'button', class: 'menu-button' }, T.continue);
      resume.disabled = characters.length === 0;
      resume.addEventListener('click', pickCharacter);
      const buttons = [newGame, resume];
      // The prologue again, once this browser saw it (it plays first after "Create").
      const prologue = options.prologue;
      if (prologue && prologueSeen()) {
        const again = el('button', { type: 'button', class: 'menu-button' }, T.prologue);
        again.addEventListener('click', () => {
          again.disabled = true;
          // The character played last: the list comes from the server in that order.
          void prologue(characters[0] ?? null).then(() => {
            again.disabled = false;
            again.focus();
            // The prologue's music faded out at its end: the menu's comes back.
            sounds.music();
          });
        });
        buttons.push(again);
      }
      const settings = el('button', { type: 'button', class: 'menu-button' }, T.settings);
      settings.addEventListener('click', settingsScreen);
      buttons.push(settings);
      const out = el('button', { type: 'button', class: 'menu-link' }, T.signOut);
      out.addEventListener('click', () => {
        out.disabled = true;
        api.signOut().then(home, (error: unknown) => fail(error, () => void home()));
      });
      const remove = el('button', { type: 'button', class: 'menu-link' }, T.deleteAccount);
      const account = el('p', { class: 'menu-account' }, T.signedIn(me?.user?.via ?? 'google'), ' · ', out, ' · ', remove, ' · ', privacyLink());
      remove.addEventListener('click', () => {
        // Ask first: the account and every character go at once.
        const yes = el('button', { type: 'button', class: 'menu-small danger' }, T.deleteAccountYes);
        const no = el('button', { type: 'button', class: 'menu-small' }, T.keep);
        const ask = el('div', { class: 'account-ask', role: 'alertdialog', 'aria-label': T.deleteAccountAsk }, el('p', {}, T.deleteAccountAsk), el('div', { class: 'menu-actions' }, no, yes));
        no.addEventListener('click', () => {
          ask.replaceWith(account);
          remove.focus();
        });
        yes.addEventListener('click', () => {
          yes.disabled = true;
          no.disabled = true;
          api.deleteAccount().then(
            () => {
              characters = [];
              void home();
            },
            (error: unknown) => fail(error, main),
          );
        });
        account.replaceWith(ask);
        no.focus();
      });
      show(
        'open',
        el(
          'section',
          { class: 'menu-screen menu-main' },
          el('h2', { class: 'sr-only', tabindex: '-1' }, options.title),
          el('div', { class: 'menu-actions menu-stack' }, ...buttons),
          account,
          languageChoice('menu-account lang-choice', () => location.reload()),
        ),
      );
      newGame.focus();
    };

    /**
     * The settings: the controls of the game (to read), the language, the sound (ui/sound-section.ts),
     * the tips (ui/tips.ts), and for an admin the display settings (the CRT effect; the game reads
     * them when it starts).
     */
    const settingsScreen = () => {
      const back = el('button', { type: 'button', class: 'menu-button' }, T.back);
      back.addEventListener('click', main);
      const parts: HTMLElement[] = [
        el('h2', { class: 'menu-title', tabindex: '-1' }, T.settings),
        el('h3', { class: 'menu-subtitle' }, T.controls),
        controlList(),
        el('h3', { class: 'menu-subtitle' }, STRINGS.settings.language),
        languageChoice('lang-choice menu-settings-lang', () => location.reload()),
        el('h3', { class: 'menu-subtitle' }, STRINGS.sound.heading),
        soundSection(false),
        el('h3', { class: 'menu-subtitle' }, STRINGS.tips.heading),
        tipsControls(),
      ];
      if (me?.user?.admin === true) {
        const display = new CrtControls(crtStateFrom(new URLSearchParams(location.search), loadSavedCrt()), () => {});
        parts.push(el('h3', { class: 'menu-subtitle' }, T.display), display.element);
      }
      show('panel', el('section', { class: 'menu-screen menu-settings' }, ...parts, el('div', { class: 'menu-actions' }, back)));
    };

    const create = () => {
      if (characters.length >= MAX_CHARACTERS) {
        notice = T.limit(MAX_CHARACTERS);
        return pickCharacter();
      }
      const made = new CharacterBuilder(options.skins, {
        back: main,
        turn: () => sounds.screen(),
        create: (sheet: CharacterSheet) => {
          made.setBusy(T.creating);
          api.create(sheet).then(
            (character) => void start(character, true),
            (error: unknown) => {
              made.setBusy(null);
              say(error instanceof ApiError && error.message === 'limit' ? T.limit(MAX_CHARACTERS) : error instanceof ApiError && error.status === 0 ? T.serverDown : T.failed);
            },
          );
        },
      });
      show('panel', made.element);
      builder = made;
      made.focusTitle();
    };

    const pickCharacter = () => {
      const back = el('button', { type: 'button', class: 'menu-button' }, T.back);
      back.addEventListener('click', main);
      const list = el('ul', { class: 'character-list' });
      for (const character of characters) {
        const portrait = new SkinPortrait(options.skins, 2, false);
        portrait.show(characterLook(character));
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
        'panel',
        el(
          'section',
          { class: 'menu-screen' },
          el('h2', { class: 'menu-title', tabindex: '-1' }, T.continueTitle),
          characters.length ? list : el('p', { class: 'menu-hint' }, T.noCharacters),
          el('div', { class: 'menu-actions' }, back),
        ),
      );
    };

    /**
     * Asks the server who is signed in, and shows the sign-in or the main screen. After a reload
     * for a new build (menu/resume.ts), it starts the same character again at once; after "Load
     * game" or "New game" in the game menu, it shows the list of characters or the builder.
     */
    const home = async () => {
      loading();
      try {
        me = await api.me();
        if (!me.user) {
          sounds.music();
          return signIn();
        }
        characters = await api.characters();
        const resume = takeResume();
        const again = resume ? characters.find((c) => c.id === resume) : undefined;
        if (again) return void start(again);
        // The music of the menu (not after a reload for a new build: the game goes on at once).
        sounds.music();
        // The game menu asked for a screen: "Load game" (the list) or "New game" (the builder).
        const screen = takeMenuScreen();
        if (screen === 'new') return create();
        if (screen === 'load' && characters.length > 0) return pickCharacter();
        main();
      } catch (error) {
        fail(error, () => void home());
      }
    };

    // Escape goes back from the builder and from the list.
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !me?.user) return;
      if (builder || screen.querySelector('.character-list, .menu-settings')) main();
    });

    void home();
  });
}
