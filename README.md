# game

A proof of concept (POC) for an online, multiplayer, sandbox pixel-art game that runs in the
browser. Live at https://game.azyr.io.

The POC is a dark, top-down world in the mood of Diablo and Castlevania: a hooded figure walks
with WASD or the arrow keys, or with a touch joystick on a phone, inside a radius of torch
light. The world is procedural and endless: grass, mud paths, lakes, spruces, dead trees, rocks.
Stone houses stand in the woods: open the door, step in, and the roof fades away to show the
room. Very close to a tree, a rock or a piece of furniture, the action button (or E) examines
it; at a door it opens or closes the door.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run check      # type check + tests
npm run build      # production build in packages/client/dist
```

Debug panel: press F3, or open `/?debug`. Another world: `/?seed=42`. Start on a tile: `/?at=-2,2`.
No darkness: `/?nolight`.
Display settings: the button in the top-right corner (CRT on/off and sliders; saved in the
browser). The same from the URL: `/?nocrt`, or `/?crt=spread,mix,glow,scanline` (defaults
`0.6,1,1,0`).

- `docs/stack.md`: the stack and the reasons for it.
- `deploy/README.md`: how game.azyr.io is deployed.
- `CLAUDE.md`: the layout and the rules of the code.
