# Art

This file is part of the documents of the code (see the map in `CLAUDE.md`). Read it before you
change its part of the code, and change it in the same commit as the code.

Style: dark, desaturated and realistic in proportion, after Diablo and Castlevania. It is
approved: new art must match it. The art is made by code, in `packages/engine-client/art/`.

**The atlas and Android GPUs.** `build.ts` packs one atlas, 1024 px wide; the build fails if it
grows past 2048 px on a side (make it wider then). Each frame repeats its edge pixels 1 px into
the gap round it. And `game.ts` makes every fragment shader ask for `highp`. All three are for
phones: many Android GPUs run `mediump` with 16-bit floats, and on the old 512 x 2995 atlas a
texture coordinate near the bottom was off by 0.7 texel: black lines across the ground tiles,
broken letters (2026-10-08). See `docs/browser-checks.md` to emulate such a GPU.


- `sdf.ts`: a small offline renderer for "pre-rendered" sprites. A model is a list of SDF parts
  (sphere, ellipsoid, box, cylinder, round cone, capped cone, with noise displacement) with
  materials. One ray per pixel, one fixed light from the top left, the result put into the
  shades of the material (`ramp`), then an outline and contact lines. Two projections:
  `'pitch'` (default; depth foreshortened: round, small things such as the player, trees,
  rocks) and `'oblique'` (depth not foreshortened, so a model fills whole tiles of the ground
  grid: walls, doors, fixtures).
- `figure.ts`: **the** human figure, as parameters (`FigureSpec`: height, build, head;
  headwear, hair, beard and `beardLength`, cloak cut, body, pauldrons, scarf, pouch, tabard,
  horns, circlet, item; for races and classes `ears`, `tusks`, `nose`, `shield`, `quiver`,
  `antlers`, `feather`, all off by default) and colours (`Palette`). Items: staff, orb staff,
  sword, lantern, axe, mace, dagger, bow. Each part has a bounding sphere, so the figure renders
  fast. A new field must default to off: the atlas (the wanderer, the NPCs) must not change.
- `characters.ts`: the default player (the hooded wanderer, about 28 px tall, 8-frame walk, four
  real views: frames `player/<view>/...`) and the NPC looks (`NPC_LOOKS`: cloak colours, hood up
  or down, hair, and optional `spec` and `palette` that change parts of the wanderer: the
  people of Ironhold `watchman`, `innkeeper`, `priest`, `child`; frames `npc/<look>`), all from
  `figure.ts`.
- `skins.ts`: player skins. A skin is a 32-bit seed that holds the look of a character:
  `appearanceOf(seed)` (`@game/engine`, `character.ts`) gives its race, class and gender (the
  low 9 bits) and a variant (the other 23 bits). The race gives the silhouette (a dwarf short and
  very broad, a gnome or a halfling small, a gnome's head big, an elf tall and slender, a half-orc
  big with grey-green skin and tusks), the skin tones, the hair, beards and pointed ears (elf
  long, half-elf short; they show only with a bare head or a hat). The class gives the garments,
  the headwear, the item and the colour families (a barbarian's fur and axe, a cleric's mace and
  shield, a druid's antlers, a ranger's bow and quiver, a wizard's pointed hat). The gender gives
  the shoulders, beards and the hair; the variant picks the rest. Thus every race, class and
  gender has 2^23 looks. `Skin` is `{ seed, appearance, spec, palette, style? }`. A look
  (`SkinLook`) is a seed and what shows of the gear (`ShownGear`: the main hand, the off hand and
  the armour): `dressSkin()` gives the figure the weapon and the shield that the character wears,
  its armour (medium and heavy armour: a body of metal; splint and plate: pauldrons; no armour: a
  jerkin instead of metal), and the attack style of the weapon (`HELD`; a focus of the class casts, another staff bashes, an empty
  hand casts, strikes with the palm or punches); `skinOfLook()`; `skinKey()` names a look for the
  skin store and its cache (`SkinStore.get(look)`).
  `renderSkinSheet()` gives 4 views x (stand + 8 walk + 4 attack + 4 roll + 2 fall + crouch + 8 sneak
  walk + brace + 3 evade + 4 heavy roll + 3 jump + 2 struggle + 3 grab (a shove of the sandbox:
  `struggleParts()`, `grabParts()`); the first column of each: `SKIN_COLUMNS`) frames of
  56 x 56. The columns of a view go on `SKIN_VIEW_ROWS` rows of `SKIN_ROW_CELLS` (20) frames: find a
  frame with `skinCell(column, view)`, never with `column * width`; the sheet is 1120 x 672 px (keep
  it at most 2048 on a side)
  (pivot 28, 50: room for a staff over the head or a rapier at full reach; `SKIN_PORTRAIT` is the
  32 x 48 round the figure at rest, for the settings preview). The browser runs it at run time, so `skins.ts`, `figure.ts`, `sdf.ts`,
  `raster.ts` and `image.ts` must not import Node modules (`png.ts` does; that is why `Image`
  is in `image.ts`). `skinName(seed)` names a look without a chosen name (a guest) for its class
  and gender (its own random stream, so the look of a seed never changes with the names). **Bump
  `SKIN_VERSION` when a seed would give another picture or the sheet changes**: browsers cache
  rendered skins under it. Preview many skins before you change them:
  `node art/skins-preview.ts <folder>` (in `packages/engine-client`) writes contact sheets (each
  race by gender and class, variants, views, attacks).
- `props.ts`: spruces, a dead tree and a rock. `materials.ts`: the materials that buildings and
  fixtures share (`M.<name>`).
- `buildings.ts`: building styles. Each wall style of `WALL_STYLES` (stone, timber, planks,
  brick, rubble, gothic, canvas, painted) has walls (`wall/<walls>/<mask>/<variant>`, mask bit
  1 = wall to the north, 2 = east, 4 = west), a door (`wall/<walls>/door/open|closed`, and
  `boarded`: closed, with two planks nailed across it, for a building that is shut) and a lit
  window (`wall/<walls>/window`), with the same window by day (`wall/<walls>/window/unlit`: the glass
  dark, `unlit()` in `materials.ts`). Each roof style of `ROOF_STYLES` (slate, shingle, thatch,
  canvas, indigo, battlement, clay, copper) has roof pieces (`roof/<roof>/<row>/<column>/<variant>`);
  all share `roof/shadow`. Roof props (`ROOF_PROPS`: `roof/chimney`, `roof/vane`, `roof/spire`,
  `roof/moon`, `roof/flag-wine`, `roof/flag-green`) have their pivot at their foot. Floors:
  `ground/floor/N` (wood), `ground/floorstone/N`, `ground/floorearth/N`. A wall is a 16x48
  frame: top face (16 px) over front face (32 px). Keep wall tops dark: the torch lights them
  from close by, and a pale top glares.
- `fixtures.ts`: every fixture type, `fixture/<kind>` (and `fixture/portal-glow`, white, which the
  client tints). Looks of the houses of the Wilds: `fixture/table/cold` (the candle a cold stub of
  wax) and `fixture/rug/pelt` (a bear pelt, `M.fur`). Footprints must match the boxes in `packages/engine/src/fixtures.ts`. The
  `signpost` points west only (do not mirror it); its post is on the east side of its tile.
  `herbpatch` and `cache` lie low on the ground (hidden things of Wisdom). A lit thing that goes out
  by day has an unlit frame, `<frame>/unlit` (its glass dark): the street lamp
  (`fixture/lamppost/unlit`) and the lantern of the merchant's cart (`fixture/cart/unlit`,
  `fixture/cart-mended/unlit`); fires, forges, candles and braziers stay lit. A thing with a `look`
  has the frame `fixture/<kind>/<look>`: the name sign of a settlement, `fixture/namesign/iron` (the
  Iron Sovereignty: two posts of dark oak with iron caps) and `fixture/namesign/mithril` (the Mithril
  Enclave: two pillars of pale stone, `M.paleStone`, with small gold domes); the page hangs the plate
  with the name between them, see `font.ts`. A new dominion's style is a new look, with its plate and
  its shield. The standard (`fixture/standard`: the grey cloth with the red phoenix of the Ashen
  Seekers) has the look `iron` too (`fixture/standard/iron`: the anvil of pale iron of the shield of
  the Sovereignty on wine red, with a swallowtail; the standard of Bronzehold). The stairs between two storeys (`fixture/stairs`: eight steps over 2 x 2 tiles that rise
  one storey) and the stairwell above them (`fixture/stairwell`: the opening with a railing). The
  palisade of a town (`fixture/palisade/<0-15>`: two rows of sharpened logs; the look is the sides that
  join a neighbour, `PALISADE_SIDES` in the engine: 1 north, 2 east, 4 south, 8 west; a run north to
  south has three columns of logs, so that its tips make one strip).
- `mobs.ts`: the mobs, SDF models in poses: the imp (small, horns, bat wings, claws, tail) and the
  brute (big grey ghoul with tusks and a spiked club). Frames `mob/<kind>/<view>/stand`,
  `.../walk/<0-5>`, `.../windup/<0-1>`, `.../strike/<0-1>`, `.../die/<0-5>`, and
  `mob/<kind>/shadow`; a kind that ambushes (`CROUCHING`: the bandit) also has `.../crouch` and
  `.../creep/<0-5>`; the goblins of the sandbox (`SHOVE_ANIMATED`: the skirmisher) also have the frames
  of a shove, `.../struggle/<0-1>`, `.../fall/<0-2>` (thrown on its back, its eyes open) and
  `.../rise/<0-1>` (the poses `grapple`, `floored`, `rise` of `MobPose`). The eyes are a material of their own: the build lists the eye pixels of
  each frame in `meta.mobEyes`, and the game draws them glowing above the darkness. In a death
  the eyes go dark. Preview the frames when you change a model: poses that look right in one
  view can hide the head in another.
- `attacks.ts`: how each skin attacks. `attackStyle(class, spec)`: a sword, an axe or a mace
  slashes (a bard's rapier thrusts), a dagger thrusts (a rogue), a bow shoots (a ranger: the bow
  held out, the string drawn to the chin, the release; the engine flies the arrow), a staff bashes with
  both hands, an orb staff casts a spell, a lantern throws flame; without an item a sorcerer or a
  warlock casts from the hands and a monk strikes with the palm. A caster's spell takes the
  colour of its `palette.glass` (sorcerer fire, warlock green or violet, wizard blue, druid
  green). Each style has four poses (`attackAction`: arm directions, a lean, the weapon
  in the hand, as a `FigureAction` for `figure()`), rendered as the attack frames of a skin sheet
  and as `player/<view>/attack/<i>` (a punch) for the atlas wanderer. All melee attacks reach as
  far: only the look differs. The roll of a dodge: `rollPose()` and `rollParts()` (four frames: the
  figure tucked, `FigureAction.tuck`, and turned forward round its middle by `tumble()` in
  `figure.ts`), in every skin sheet and as `player/<view>/roll/<i>` for the wanderer. The heavy roll
  (a heavy load): `heavyRollParts()` (four frames: the figure drops low, rolls over its right shoulder,
  `tumble()` and `sway()`, and ends on one knee, `FigureAction.kneel`), in every skin sheet and as
  `player/<view>/heavyroll/<i>` for the wanderer. The fall of
  a defeat: `fallParts()` (two frames: the figure turns back round its hips, then lies on its
  back), as `player/<view>/fall/<i>` for the wanderer. The sneak: `sneakParts()` (the crouch at
  rest, and eight frames of the sneak walk with short strides: `FigureAction.crouch` bends the
  knees, spreads them a little and brings the arms forward; the lean bends the body forward), in
  every skin sheet and as `player/<view>/crouch` and `player/<view>/sneak/<i>` for the wanderer.
  The brace: `braceParts()` (the knees bent, one foot back, the weapon up in front: the guard of its
  style, `GUARDS`) and the evade: `evadeParts()` (three frames: the braced figure sways to its side
  round its feet, `sway()` in `figure.ts`, and leans back), in every skin sheet and as
  `player/<view>/brace` and `player/<view>/evade/<i>` for the wanderer. The jump from a brace:
  `jumpParts()` (three frames in the guard of the brace: the legs push off nearly straight, the knees
  come up, the knees bend to land; the page lifts them), in every skin sheet and as
  `player/<view>/jump/<i>` for the wanderer.
- `fx.ts`: the effects of a fight, white and grey, tinted by the game: the burst of sparks and the
  flash of two weapons that meet in a parry of the sandbox (`fx/spark/<0-4>`, `fx/flash`:
  `render/sparks.ts`), the effect of each attack
  style (`fx/<style>/<turn>/<0-3>`: drawn facing right and turned by 0, 22.5, 45 and 67.5
  degrees, each frame cropped to its pixels with its own anchor) and the star of a stun
  (`fx/star`), and the arrow in flight (`fx/arrow/<turn>`, tinted `ARROW_TINT`). `fxPlacement()` (`attacks.ts`) gives the 16 directions: a drawn turn, then a
  mirror and quarter turns, which keep the pixel grid. Do not rotate an effect by another angle.
  Also the ripple round a player in shallow water (`fx/ripple/<0-3>`, in its own colours).
- `ground.ts`: ground tiles from tiling noise (grass, moss, mud, gravel, water, shallow water,
  cobblestones) and the ragged edge pieces. `decor.ts`: small decor as text grids.
- `marks.ts`: the marks at the edge of the screen, white with a dark outline, tinted by the client:
  `ui/danger/<0-15>` (a chevron) and `ui/homeward/<0-15>` (an arrow), drawn at each of the 16
  angles (not turned at run time).
- `items.ts`: the item icons, SDF models of 16 x 16 (`item/<kind>` for each `ITEM_KINDS`, and
  `item/coin`), with materials of their own, a little lighter than the world's: the pack panel
  shows them at 2x on a dark slot. The same models at 0.7 of the size, with a shadow, are the
  items on the ground (`pile/<kind>`, anchor on the point where the item lies); `pile/<kind>/bare`
  is the same without the shadow and `pile/shadow` the shadow alone (an item in the air, the
  shine), and `pile/glint` is the spark over a pile (white, tinted gold; white, it is also the
  spark of a glancing blow on the player). The equipment has models of its own: `cuirass()` (a
  pattern for each armour), `shield()`, `sword()`, `greataxe()`, `mace()`, `longbow()`, `staff()`,
  `amulet()`. Preview new icons on a dark slot before you commit them.
- `menu-logo.ts`: the logo of the menu (`menuLogo()`): "WORLD OF" in the pixel font over "KANDRAX",
  letters cut as vector shapes and painted as metal (bevel, outline, glow, rubies, glints), and the
  frames of a shine under the logo at rest. `build.ts` writes `src/generated/menu-logo.png` and
  `menu-logo.json`.
- `lights.ts`: light holes at the radii of `LIGHTING.radii` (48, 96, 150) and the glow. The
  settings go into the atlas JSON (`meta.lighting`).
- `font.ts`: the pixel font (capitals 7 px, descenders 2 px, white glyphs that the client
  tints; frames `font/<char code>`; metrics in `meta.font`), with Spanish lowercase accents,
  ñ, ¿, ¡, ·, dashes. Accented capitals and curly quotes draw as plain ones. The small font
  (`SMALL_GLYPHS`: capitals 5 px, digits, space and `' - . _ + [ ]`; frames `smallfont/<char code>`;
  metrics in `meta.smallFont`) draws lowercase as capitals and an accented letter as the plain
  one; it is for the names over other players and the tag of a gate in a bubble. The tiny font
  (`TINY_GLYPHS`: capitals and digits 4 px, space and `' - . +`; frames `tinyfont/<char code>`; metrics
  in `meta.tinyFont`; Fede, 2026-10-15) is for every text of a fight over a player or a mob. Also the bubble
  (`ui/bubble`, `ui/bubble-tail`), the "more pages" triangle (`ui/more`), the sign board
  (`ui/sign`), the emblems on a sign board in place of a name (`ui/emblem/<name>`: `chalice`, over
  a shrine or a chapel; each with its shadow), the plate of a name sign and the shield over it (`ui/namesign/<look>`,
  `ui/crest/<look>`: `iron`, the iron plate in a wine-red frame and the anvil of the Sovereignty;
  `mithril`, a dark blue plate in a silver frame and the silver peaks of the Silver Columns on blue,
  Fede's choice of 2026-10-13) and
  the mouse cursor (`ui/cursor`: a short sword, 10 x 10, its tip on the hot spot
  at the top-left pixel).

Look at art before you commit it: a preview PNG, or a screenshot of the game with `?nolight`.
Read the PNG with the Read tool. Check a wide patch of ground tiles, not one tile.

Art preview at 4x: `cd packages/engine-client && node art/build.ts --preview /tmp/atlas.png`.
