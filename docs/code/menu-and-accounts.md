# The menu, the characters and the accounts

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

Since 2026-10-09 the game starts on a menu (`startGame({ accounts: true })`, `menu/`), HTML in the
GUI style, over the whole page (it scrolls on a phone). **Every visitor signs in to play (Fede's
decision, 2026-10-11)**: there are no guests on game.azyr.io (`?nomenu` works only on a local page,
`GUEST_HOSTS` in `game.ts`), so every player has a stored character (and later a quest book).

- **Sign-in**: "Sign in with Google" (Google's dark button, with the "G"), or in development a
  dev sign-in with a name only (or an email: see "Admins"). After Google, the page shows
  `?login=failed` or `cancelled` once.
- **Main screen**: "New game", "Continue" (off without characters), "Prologue" (only once this
  browser saw it), "Sandbox" (an admin only: the list of characters for the sandbox; see
  `docs/code/combat.md`), "Settings" (the controls to read, the language, the sound (`soundSection()`), the
  switch of the tips (`ui/tips.ts`: "Show tips", "Show all tips again"), and for an admin the CRT
  settings; the settings of the game menu have the same sections),
  "Sign out" (the last button, Fede, 2026-10-14), and "Signed in with Google · Delete account ·
  Privacy". Behind the menu: Nivalia at
  sunset in pixel art (`art/menu-art.ts`, `src/generated/menu.png`). **The logo and the layout**
  (Fede, 2026-10-13): the logo of the game, painted in pixel art (`art/menu-logo.ts`,
  `src/generated/menu-logo.png`; `menu/logo.ts`), is at the top; on the sign-in and the main screen
  the buttons are at the bottom of the page, with no box round them (`Layout` `open`); the builder,
  the list and the settings keep their panel under a smaller logo (`panel`). Music and sounds (2026-10-13,
  `menu/sounds.ts`): the opening of the theme of Kandrax, and a speaker at the top right. See
  `docs/features/game/main-menu.md`. "Delete account" asks first, then deletes the account,
  its sessions and all its characters. "Privacy" opens `/privacy/` (`apps/game/privacy/
  index.html`, a second Vite page; its text must say what the server keeps, so change it with
  the data). The sign-in screen links it too. An account keeps at most `MAX_CHARACTERS` (12).
- **New game**, the character builder (`menu/builder.ts`), two steps. 1, Appearance: race
  (human, dwarf, elf, gnome, half-elf, halfling, half-orc), class (barbarian, bard, cleric,
  druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard), gender (male, female,
  undetermined), name (2 to 16 characters after `cleanName()`; "Random name" gives an SRD name
  of the race), "Another look" (a new random variant), and a preview that walks and turns.
  2, Abilities: point buy of D&D 5e (SRD 5.1): each score starts at 8, 27 points, at most 15;
  the race's increases (with the SRD subrace: hill dwarf, high elf, rock gnome, lightfoot
  halfling); a half-elf chooses two abilities other than Charisma for +1; the class's main
  abilities are marked. "Create" stores the character and the game starts.
- **Continue**: the account's characters (the last played first), each with its picture; one
  plays it, "Delete" asks first. A character starts where it was last (below, "The place of a
  character").
- In the game, the "Character" button (top right) opens the character panel: the character, its
  level, its scores and what they give. "Main menu" (a reload: the menu comes again) and the settings
  are in the game menu, and "Sign out" is on the main screen of the menu (Fede, 2026-10-14).
- **The game is called World of Kandrax** (Fede, 2026-10-12): `GameOptions.name` (`apps/game/src/main.ts`)
  is the page title and the title of the menu and of the game menu; "The Wilds" stays the name of the
  world (the map). The name is the same in Spanish.
- **The prologue** (2026-10-12, `ui/prologue.ts`, `docs/features/game/prologue.md`): nine painted
  scenes of Kandrax (`art/prologue.ts`, `art/prologue-map.ts`, `art/prologue-dominions.ts`,
  `art/prologue-kit.ts`, `art/paint.ts`; their own atlas, `src/generated/prologue.png`, loaded only when
  it plays) with Fede's texts (`worlds/wilds/src/prologue.ts`). The map is Fede's map of Thrain on the
  Drive (`Images/maps/mapa_thrain.png`): a tall layer that rises (`PrologueLayer.rise`), its names in
  one layer for each language (`lang`). A card can have a banner (`PrologueCard.banner`: the two
  dominions), drawn with the pixel font as the name of a world on arrival; `bannerLine` makes it wait
  for the line that names the place (the Iron Sovereignty: its second line). The lines type from left to
  right, one under the other, under the scene or beside it (`prologueLayout()`). It plays once after
  "Create" in the builder, and from "Prologue" in the game menu; `?prologue` plays it for any start.
  It has the theme of Kandrax, an ambience for each scene and small effects, and a speaker button that
  mutes all sound (`audio/`, `docs/features/game/sound.md`). **Only the player leaves a card** (Fede,
  2026-10-13): the lines of a card come by themselves, then the card waits. **The music** is the opening
  of the theme (`KANDRAX_OPENING`, round and round) until the card with `crescendo` (the gods), where the
  rise (`KANDRAX_RISE`: the choir and the violins) comes in on a chord or a beat
  (`AudioEngine.nextMusicBeat()`), however long the player took. The card with `calm` (the hut, the last
  one) brings the coda in the same way (`KANDRAX_CODA`: a clarinet over a harp and soft low strings;
  Fede, 2026-10-13).
- **The game menu** (2026-10-12, `ui/game-menu.ts`, `docs/features/game/game-menu.md`): Escape opens it
  over the game when no other panel, conversation or dream is open (on a touch screen, a faint icon
  under the character button opens it), with these choices only, in this order (Fede, 2026-10-14):
  "Main menu" (a reload into the main screen), "Load game" (a reload into the list of characters),
  "Sandbox" (an admin only: a reload into the list for the sandbox), "Settings" (a second screen in the same panel with the controls to read, the language, the sound,
  the tips, and for an admin the display and the experience; "Back" or Escape goes back to the
  choices) and "Prologue". No button has the focus when it opens: Enter does not leave the game by
  mistake. Escape or a click outside the panel closes it. The character stands
  still meanwhile; a world that the page runs stands still too, a shared world goes on. It rustles when
  it opens and closes, and the music steps back to 40 % under it (Fede, 2026-10-13).
- **A new build reloads the page (Fede's decision, 2026-10-10).** After a deploy, an open page
  finds the new build (`ui/new-build.ts`) and reloads itself at a calm moment: no conversation, no
  defeat, no mob that hunts the player. It says "A new version of the game is out. Loading it…"
  first, and the menu then starts the same character again (`menu/resume.ts`).

**The rules** are in `packages/engine/src/character.ts`, for the page and the server alike:
`RACES`, `CLASSES`, `GENDERS`, `ABILITIES`, `POINT_BUY`, `RACE_BONUS`, `CLASS_PRIMARY`,
`checkSheet()` (the server checks every sheet with it) and the look in one number
(`appearanceSeed()` / `appearanceOf()`, see `skins.ts` in `docs/code/art.md`). A character is a
`CharacterSheet` (name, race, class, gender, variant, base scores, bonus choices) with an id and
its times. Its skin seed is `characterSkin(sheet)`. Its texts (names of races, classes and
abilities, one line about each) are in `ui/strings.ts`. What the scores do in the game: "Ability
scores in the game", below.

**The place of a character** (since 2026-10-10): the store keeps where each character was last
(`Character.place`: world, and the centre of its feet in world pixels; `checkPlace()`; the column
`place`). The game starts it there (`resumePoint()`: the exact point if its feet fit, else the
nearest open tile, for example when a door that was open is closed now); `?at=` wins over it.
Who keeps it:
- In a world that the page runs (none now; `?offline`), the page sends it with `PUT
  /api/characters/<id>/place`: every 10 s if the player moved, when the page hides or closes
  (`keepalive`), and before "Main menu" and "Load game". A guest has no place.
- In a world that the server shares, the server keeps it: when the player leaves, and at each
  heartbeat (25 s). The route refuses such a world (409), so a page cannot move a character there.

**The accounts** are in the game server (`packages/engine-server/src`): `google.ts` (OpenID
Connect with the scope `openid email`, the code flow with PKCE and a state bound to the browser by
a cookie; the ID token comes straight from Google, and the server checks its issuer, audience and
expiry), `store.ts` (SQLite by `node:sqlite`: users, sessions (only a hash of each token),
sign-in states, characters as JSON; a schema version and migrations), `accounts.ts` (the routes;
see its comment). **Keep personal data to a minimum (Fede's decision, 2026-10-10):** an account
is the provider's id (Google's `sub`), its email and its times; the server never asks for or
keeps a name or a picture, so the privacy page stays short. The email is the column `email` (since
2026-10-10, Fede's decision: the server knows the admins by it): each sign-in sets it, and only an
email that Google verified, in lowercase; else ''. Change the privacy page with the data.
`DELETE /api/me` deletes an account with everything in it. **One device at a time (Fede's rule, 2026-10-10):** a sign-in ends the
account's other sessions (`AccountStore.createSession`); the server closes their connections
(`refused` `elsewhere`, protocol 9), and saves the character's place first. A page whose session
ended (any 401, `/api/me` every 10 s, or that refusal) goes to the sign-in screen with
`?login=elsewhere`, which says why. Two tabs of one browser share one session. The session is
the cookie `game_session` (HttpOnly, SameSite=Lax, Secure on https, 30 days, renewed in use).
A request that changes something must have the Origin of one of the game's pages (`ORIGINS`).
In a shared world the server takes the look, the name and the place from the stored character
(`docs/multiplayer.md`, protocol 7). `apps/game/server/main.ts` reads the settings from the
environment (its comment lists them): `GAME_DB` turns the accounts on; in production it refuses
to start without the Google client or with `AUTH_DEV_LOGIN`. Production keeps the secrets in
`/etc/game/secret.env` and the database in `/var/lib/game/game.db`, with a nightly copy that
gpg encrypts (`scripts/backup-db.ts`, passphrase in `/etc/game/backup.passphrase`). See
`deploy/README.md`, "Accounts".

**Admins** (since 2026-10-10): the accounts whose email is in `ADMIN_EMAILS` (comma-separated;
`Accounts.isAdmin()`). Now Fede is the only admin (Fede's decision). The list is in
`/etc/game/secret.env` in production and in `.env.local` on the laptop, never in git: the
repository is public. `/api/me` says `admin`, and the menu gives it to the game. Only an admin sees
the display settings (the CRT switch and sliders, in the settings of the game menu and of the menu); the others get `CRT_DEFAULTS`, and the game
ignores what their browser saved (`?crt=` and `?nocrt` work for everyone). An admin also chooses the
divisor of the XP of the kills of its own characters (2026-10-14, to test the levels: "Experience" in
the settings of the game menu, `ui/xp-section.ts`; `PUT /api/me/xp-divisor`, the column `xp_divisor` of `users`; the
server gives it to the Room at once, `Room.setXpDivisor()`); the others always have `KILL_XP_DIVISOR`. **The admin
tools** (2026-10-15, Fede's request; `docs/features/game/admin-tools.md`): the section "Admin tools" in the
settings of the game menu (`ui/admin-section.ts`) moves the hour of the world, takes the character to a place
or a tile, gives coins and items, sets the level or gives XP, puts mobs beside the character
(`spawnBeside()`, as `?mob=`) and sets a quest at a step. Each tool is a command (`AdminCommand`,
`packages/engine/src/admin.ts`): in a shared world the page sends it (the message `admin`, protocol 49), and
the server applies it with `Room.admin()` only for an admin, on the live site too, and saves the character at
once; in a world that the page runs, the page applies it (`runAdmin()` in `game.ts`). The hour is for every
player of the shared world (Fede's decision): the Room keeps a shift of the clock (`Room.hourShift`,
`shiftToHour()`), the pages get it (`hs`) and add it to their clock, and "Real clock" or a restart of the
server takes it away. The dev sign-in takes
an email as the name: it then signs in with that email, as Google would, so an admin email there
is an admin.
