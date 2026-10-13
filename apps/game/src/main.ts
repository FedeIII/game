import { startGame } from '@game/engine-client';
import { DEFAULT_WORLD, WORLDS, shareWorlds } from './worlds.ts';

/** The worlds that this build shares (SHARED_WORLDS, see vite.config.ts); empty in production. */
declare const __SHARED_WORLDS__: string;

// The game, at https://world.kandrax.app (the main address, since 2026-10-13) and at its mirror
// https://game.azyr.io: both serve this page. azyr.io has the Town of Azyr, from its own copy of
// the engine (the branch town). The menu shows the main address on both.
// It has accounts (the server's /api/ and /auth/): the menu comes first.
// The game is called World of Kandrax (Fede, 2026-10-12): the page title and the title of its menus.
startGame({ worlds: shareWorlds(WORLDS, __SHARED_WORLDS__), defaultWorld: DEFAULT_WORLD, name: 'World of Kandrax', title: 'world.kandrax.app', accounts: true });
