# game

A proof of concept (POC) for an online, multiplayer, sandbox pixel-art game that runs in the
browser. Live at https://game.azyr.io.

The POC is a dark, top-down world in the mood of Diablo and Castlevania: a hooded figure walks
with WASD or the arrow keys, or with a touch joystick on a phone, inside a radius of torch
light. The world is procedural and endless: grass, mud paths, lakes, spruces, dead trees, rocks.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run check      # type check + tests
npm run build      # production build in packages/client/dist
```

Debug panel: press F3, or open `/?debug`. Another world: `/?seed=42`. No darkness: `/?nolight`.
No CRT effect: `/?nocrt`. Other CRT settings: `/?crt=spread,mix,glow,scanline` (defaults `0.5,0.5,0.3,0.08`).

- `docs/stack.md`: the stack and the reasons for it.
- `deploy/README.md`: how game.azyr.io is deployed.
- `CLAUDE.md`: the layout and the rules of the code.
