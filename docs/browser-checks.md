# Verify a change in a browser

How to see a change in a real page: Playwright, the switches of the URL, and the elements that a test uses. Change this file when a new switch, a new element or a new step comes.

Playwright is not a dependency of this repo; the hidden-agenda checkout has it, in both places.

- **On the VPS** there is no GPU, but headless Chromium renders WebGL with SwiftShader (slowly:
  1 to 6 FPS is normal there; with the CRT at a phone resolution a screenshot takes about a
  minute: give `page.screenshot` a `timeout` of 180000).

  ```js
  const { chromium } = require('/opt/hidden-agenda/node_modules/playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  ```

- **On the laptop** the default headless Chromium also uses SwiftShader, but at about 30 FPS,
  and a screenshot takes less than a second. `channel: 'chromium'` uses the real GPU (Apple M1,
  Metal) instead.

  ```js
  const { chromium } = require(process.env.HOME + '/Projects/hidden-agenda/node_modules/playwright');
  const browser = await chromium.launch({ channel: 'chromium' });   // or no options: SwiftShader
  ```

Serve the build with `npx vite preview --port 4173` in `apps/game`. For a shared world, build with
`SHARED_WORLDS=wilds npm run build`, and run the game server with `SHARED_WORLDS=wilds npm run
server` (port 3020; the preview sends `/ws` to it). Or use `scripts/dev.sh --no-open`: the Wilds
shared, the page on 3019. A second test server needs a free port: `PORT=<port>
ORIGINS=http://127.0.0.1:4173 node apps/game/server/main.ts`, and the preview then needs
`GAME_SERVER=ws://127.0.0.1:<port>`. Use one browser **context** per visitor. The page starts on
the menu: sign in with the dev sign-in (fill `#dev-name`, click `.dev-sign-in button`; fill an
email of `ADMIN_EMAILS` to see the display settings: the server needs the list), "New
game", the builder (`label[for=builder-race-<race>]`, `...-class-<class>`, `...-gender-<g>`,
`#builder-name`, `#builder-next`, `#builder-<ability>-up`, `#builder-<ability>-bonus`,
`#builder-create`), and wait for `#menu` to go. The game menu: Escape, `#game-menu`,
`button[data-choice=<choice>]` (`settings` shows `.game-menu-settings`; for an admin, the admin tools there:
`#admin-now`, `#admin-hour` with `#admin-hour-set` and `#admin-hour-real`, `#admin-place` with
`#admin-place-go`, `#admin-tx`, `#admin-ty` with `#admin-tile-go`, `#admin-item`, `#admin-count` with
`#admin-give`, `#admin-level` with `#admin-level-set`, `#admin-xp` with `#admin-xp-give`, `#admin-mob`,
`#admin-mob-count` with `#admin-mob-spawn`, `#admin-quest`, `#admin-step` with `#admin-quest-set`, and
`#admin-status`); the character panel:
`#character-button`, `#character`. A conversation: `#conversation` (hidden when
closed), `.conversation-text`, `.conversation-said`, `.conversation-answer` (`.selected`). `?nomenu` skips it: a guest. URL switches:
`?nomenu` (no menu: a guest with a random look; nothing is saved, and a shared world refuses it;
only on `localhost` or `127.0.0.1`: every visitor of game.azyr.io signs in, Fede's decision of
2026-10-11),
`?world=<id>` (when an app has more than one world), `?debug` (read `#debug` for the world, the skin (race, class, gender), `char` (the character id, or guest), tile, target, building, and `net` (the others in the world, the near ones and the names
that show) and `others` in a shared world; `walkers`, `doors`, `lines`, `talk` (the conversation: the dialog's
name, the node and the selected answer) and `intro` in a world with NPCs; `place` (the visit of a place
with a title, and the phase of its title); `sky` (the hour, the darkness and the lights); `mobs` and
`fight` in a world with mobs; `traits` (what the scores give, and `(wading)`), `dex` (the
Dexterity traits, the dodge ticks, the kind and the safe ticks of the roll and the load, the brace, the evade and the jump, sneaking, the arrows in flight), `con` (HP, recovery,
stamina and its refill of now, a defeat, poison, drink, refuges), `int` (the opening, the reading of a mob, the map
detail, the seen chunks), `wis` (the sense, the seek, the night, the arrow, the hunters and the
marks), `cha` (the shares of prices, the presence, the daunt, the inspire and the greetings) and
`cmp` (each companion, its tile, a stun or a defeat; and its mode and HP in a world that the page
runs), `xp` (the XP, the level, the next level and the divisor of a kill), `pack` (with the load in pounds), `gear` (the worn items, AC, the attack with its bonus and its dice, the walk) and
`piles`; `doors`
lists the forced doors too), `#pack-button` and `#pack` (the pack panel: `.pack-slot[data-slot=<i>]`
for each slot, `.gear-slot[data-gear=<slot>]` for each worn slot (also a `.pack-slot`, with
`data-slot` 32 to 43), `.gear-stats`, `.pack-pick` in each used one (drag it with the mouse, or with touch events: a
`.pack-ghost` follows the pointer), `.pack-detail`, `.pack-action`), `#shop` (a shop:
`.shop-tab[data-side=buy|sell]`, `.shop-ware[data-ware=<id>]`, `.shop-trade`, `.shop-say`; in a shared
world the server takes the place of a character from the store, so `?at=` works only within 64 tiles
of it), `#belt` and `.belt-drink` (the drink belt), `#map-button` and
`#map` (the map panel), the sandbox (an admin: `#menu-sandbox`, then `.character-play`; `#sandbox-button`,
`#sandbox`, `input[data-mechanic=<id>]`, `input[name=sandbox-foe]`; the switches can be put in
localStorage `game.sandbox.v1` before the page loads: `{ "foe": "skirmisher", "mechanics": [...] }`;
the debug line `sandbox`), `?offline` (a
shared world played alone), `?skin=<n>` (another skin, not saved), `?nointro`, `?introat=<ms>`,
`?lang=en|es` (the language, not kept), `?mob=imp,brute` (mobs next to the player), `?companion=<look>` (a companion of that NPC look
next to the player, which follows it; a world that the page runs), `?nomobs` (no mobs: use it in tests that walk about),
`?attackpose=<tick>,<facing or degrees>` (the player frozen at that tick of an attack in that
direction, degrees clockwise from east: a screenshot of it),
`?at=tx,ty`
(start on that tile, or the nearest open one), `?seed=`, `?nocrt` (much faster under
SwiftShader), `?nolight`, `?hour=<0-24>` (the hour of the day stops there: `?hour=12` noon, `?hour=0`
midnight). Read a dialog from the live region `.sr-only[data-speech=dialog]` (the
welcome has `[data-speech=welcome]`), and the link from `#link-card a`. For touch, use a context
with `hasTouch: true` and send
`Input.dispatchTouchEvent` through a CDP session; a `touchEnd` releases the points that it
lists, so list only the finger that lifts.

To see what a phone GPU with 16-bit floats shows (SwiftShader computes in 32 bits), round the
texture coordinates in the page's shaders before they compile: `page.addInitScript` that wraps
`WebGL2RenderingContext.prototype.shaderSource`, adds
`vec2 fp16q(vec2 v){ vec2 e = exp2(floor(log2(max(abs(v), vec2(1e-20)))) - 10.0); return floor(v / e + 0.5) * e; }`
before `void main`, and replaces `texture(t, vUV)` by `texture(t, fp16q(vUV))` (only in shaders
with `precision mediump float`, as a real GPU; or in all of them, as a GPU without highp). Use an
Android viewport (412 x 915, `deviceScaleFactor: 2.625`).
