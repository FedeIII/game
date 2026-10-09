# game

A pixel-art game engine for the browser, and the applications on it. Live at
https://game.azyr.io, with one world:

- **The Wilds**: a dark, endless forest in the mood of Diablo and Castlevania. A hooded figure
  walks in a radius of torch light; stone houses stand in the woods: open the door, step in,
  and the roof fades away to show the room. Mobs live in the woods: quick little imps and slow
  brutes with clubs. They run at you on a curve; a hit stuns you for a moment. One blow of yours
  kills an imp; a brute takes three, and each one throws it back.

The Town of Azyr, the landing page of https://azyr.io, began here. Since 2026-10-09 it is a
frozen copy of the engine on the branch `town`, so the game can change without it.

Move with WASD or the arrow keys, or a touch joystick on a phone. Very close to a thing, the
action button (or E) examines it, talks to someone, opens a door, or shows a link.
Where there are mobs, the sword button (or Space, or J) attacks: each look attacks in its own
way (a sword slash, a rapier thrust, a staff blow, a spell, a gout of flame from a lantern, a
poison cloud, a palm strike or a punch), and every attack reaches as far.

```bash
npm install
scripts/dev.sh     # server + page, http://127.0.0.1:3019, the Wilds shared (play button in Cursor)
npm run dev        # http://127.0.0.1:3019
npm run check      # type check + tests
npm run build      # production build in apps/game/dist
npm run server     # the multiplayer server (for shared worlds; none in production now), port 3020
```

Debug panel: press F3, or open `/?debug`. Other switches: `/?seed=42` (the
wilds), `/?at=11,10` (start on a tile), `/?nolight` (no darkness). Display settings: the button
in the top-right corner (your look and name, CRT on/off and sliders; saved in the browser). The same from the URL:
`/?nocrt`, or `/?crt=spread,mix,glow,scanline` (defaults `0.6,1,1,0`).

- `packages/engine`: the simulation (no browser). `packages/engine-client`: the browser
  runtime and the art. `worlds/*`: the worlds. `apps/game`: game.azyr.io.
- `docs/stack.md`: the stack and the reasons for it.
- `deploy/README.md`: how game.azyr.io is deployed.
- `CLAUDE.md`: the layout and the rules of the code, and how to add a world or an app.
