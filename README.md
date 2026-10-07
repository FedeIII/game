# game

A pixel-art game engine for the browser, and the applications on it. Live at
https://game.azyr.io, with two worlds (the map button in the top-right corner switches them):

- **The Wilds**: a dark, endless forest in the mood of Diablo and Castlevania. A hooded figure
  walks in a radius of torch light; stone houses stand in the woods: open the door, step in,
  and the roof fades away to show the room.
- **The Town of Azyr** (`?world=town`): a cobbled plaza and eight houses, one for each project
  of the azyr.io landing page. In each house a keeper introduces the project, the exhibits show
  its details, and a portal opens the real thing.

Move with WASD or the arrow keys, or a touch joystick on a phone. Very close to a thing, the
action button (or E) examines it, talks to a keeper, opens a door, or shows a portal's link.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run check      # type check + tests
npm run build      # production build in apps/game/dist
```

Debug panel: press F3, or open `/?debug`. Other switches: `/?world=town`, `/?seed=42` (the
wilds), `/?at=11,10` (start on a tile), `/?nolight` (no darkness). Display settings: the button
in the top-right corner (CRT on/off and sliders; saved in the browser). The same from the URL:
`/?nocrt`, or `/?crt=spread,mix,glow,scanline` (defaults `0.6,1,1,0`).

- `packages/engine`: the simulation (no browser). `packages/engine-client`: the browser
  runtime and the art. `worlds/*`: the worlds. `apps/game`: game.azyr.io.
- `docs/stack.md`: the stack and the reasons for it.
- `deploy/README.md`: how game.azyr.io is deployed.
- `CLAUDE.md`: the layout and the rules of the code, and how to add a world or an app.
