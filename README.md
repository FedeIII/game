# The Town of Azyr

The landing page of https://azyr.io, on a pixel-art game engine for the browser. This is the
branch `town` of the game's repository: a frozen copy of the engine, so that the town stays as
it is while the game (branch `main`, https://game.azyr.io) goes on. Change the town here, on
its own; do not merge `main` into it.

The town is **shared**: every visitor sees the others walk about,
each with a torch and a skin of its own: a random wanderer, knight, monk, witch, ranger,
plague doctor, noble or gravedigger, of any size and colour, that the browser keeps across
visits. Everyone has a name over the head: the one set in the settings panel, or else a
name that comes with the look ("Brother Aldric", "Sir Galen"). The settings panel also draws a
new look. A small cobbled plaza and a lane with eight little
houses, one for each project of the azyr.io landing page, each in its own style (a timber
counting house, a thatched healer's hut, a players' tent, a rubble keep, a stone smithy...).
In each house a keeper introduces the project, the exhibits show its details, and a portal
opens the real thing. Mobs prowl in the forest round the town, and every visitor sees the
same ones; the plaza and the lane are safe.

Move with WASD or the arrow keys, or a touch joystick on a phone. Very close to a thing, the
action button (or E) examines it, talks to a keeper, opens a door, or shows a portal's link.
Where there are mobs, the sword button (or Space, or J) attacks: each look attacks in its own
way (a sword slash, a rapier thrust, a staff blow, a spell, a gout of flame from a lantern, a
poison cloud, a palm strike or a punch), and every attack reaches as far.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run check      # type check + tests
npm run build      # production build in apps/game/dist
npm run server     # the multiplayer server, port 3009
```

Debug panel: press F3, or open `/?debug`. Other switches: `/?at=11,10` (start on a tile), `/?nolight` (no darkness). Display settings: the button
in the top-right corner (your look and name, CRT on/off and sliders; saved in the browser). The same from the URL:
`/?nocrt`, or `/?crt=spread,mix,glow,scanline` (defaults `0.6,1,1,0`).

- `packages/engine`: the simulation (no browser). `packages/engine-client`: the browser
  runtime and the art. `worlds/town`: the town. `apps/game`: the page and the server of the
  town on azyr.io (the folder kept the name that it had in the game).
- `docs/stack.md`: the stack and the reasons for it.
- `deploy/README.md`: how the town is deployed to azyr.io.
- `CLAUDE.md`: the layout and the rules of the code, and how to add a world or an app.
