import type { QuestDef, QuestEffect } from '@game/engine';

/**
 * The quests of the Wilds (the engine's quests.ts). The story is chapter 1.5.1 of Kandrax, "The
 * Razed Villages" (docs/drafts/story-razed-villages.md): a letter from Thrain Steelforge starts it,
 * and a merchant with a broken cart on the road to Ironhold is the first errand. The effects are
 * here; the dialogs (dialogs.ts) and the letter (home.ts) carry them.
 */

/** The coins that the merchant pays for the help with the cart. */
export const CART_REWARD = 10;

export const ASHES: QuestDef = {
  id: 'ashes',
  title: 'The Razed Villages',
  steps: [
    {
      id: 'letter',
      journal: 'Thrain Steelforge asks me to find out who burns the homesteads of the Wilds. His letter says: begin with Elama Rothenel, the reeve of Ironhold.',
      npc: 'reeve',
    },
    {
      id: 'reeve',
      journal: 'Elama Rothenel, the reeve of Ironhold, says that three homesteads burned since the spring. Nobody saw who burned them. Each house was searched before the fire.',
    },
    // The end of the story comes with its later steps (the ruins, the symbol, the dream).
    { id: 'found', journal: 'I know now who burns the homesteads of the Wilds.', end: true },
  ],
};

export const CART: QuestDef = {
  id: 'cart',
  title: 'The Broken Cart',
  steps: [
    {
      id: 'met',
      journal: "A merchant's cart broke down on the road to Ironhold. Somebody must lift it while the merchant puts the wheel on, or bring a lever from the smith of Ironhold.",
      npc: 'merchant',
    },
    { id: 'lever', journal: "The smith of Ironhold gave me a lever for the merchant's cart on the road.", npc: 'merchant' },
    { id: 'done', journal: 'I helped the merchant to put the wheel back on the cart. The merchant paid me, and goes on to Ironhold.', end: true },
  ],
};

export const RAID: QuestDef = {
  id: 'raid',
  title: 'The Hobgoblin Raid',
  steps: [
    {
      id: 'heard',
      journal: 'In the house of the reeve of Ironhold, I heard that hobgoblins go through the hills to Silverspring. They took the scout Himo. The reeve wants a word with me.',
      npc: 'reeve',
    },
    {
      id: 'asked',
      journal: 'Elama Rothenel asks me to warn Silverspring, north-east of Ironhold, before the hobgoblins come. Ironhold cannot pay. The soldiers of the Sovereignty want me to stay out of it.',
    },
    // The later steps come with the road to Silverspring, the grove and Silverspring (story phases 3 and 4).
    { id: 'scouts', journal: 'I killed the scouts of the hobgoblins in the grove on the road to Silverspring. Their war band goes on.' },
    { id: 'title', journal: 'Silverspring gave me a title in its guard, and a bed in the town.', end: true },
  ],
};

/** The quests of the Wilds, in the order of the journal. */
export const QUESTS: readonly QuestDef[] = [ASHES, CART, RAID];

/** The letter on the table of the home: to read it starts the story. */
export const READ_LETTER: QuestEffect = { id: 'read-letter', quest: 'ashes', to: 'letter' };
/** The reeve hears that Thrain sent the character. */
export const TELL_REEVE: QuestEffect = { id: 'tell-reeve', quest: 'ashes', to: 'reeve', from: ['letter'] };

/** The character offers the merchant its help. */
export const CART_HELP: QuestEffect = { id: 'cart-help', quest: 'cart', to: 'met' };
/** The smith gives a lever for the cart (again, if the character lost the first one). */
export const CART_LEVER: QuestEffect = { id: 'cart-lever', quest: 'cart', to: 'lever', from: ['met', 'lever'], give: { coins: 0, items: [{ kind: 'crowbar', count: 1 }] } };
/** A strong character lifts the cart (Strength 13), and the merchant pays. */
export const CART_LIFT: QuestEffect = { id: 'cart-lift', quest: 'cart', to: 'done', from: ['met', 'lever'], flag: 'lifted', give: { coins: CART_REWARD, items: [] } };
/** The character brings a lever: the merchant keeps it, and pays. */
export const CART_MEND: QuestEffect = {
  id: 'cart-mend',
  quest: 'cart',
  to: 'done',
  from: ['met', 'lever'],
  flag: 'lever',
  take: [{ kind: 'crowbar', count: 1 }],
  give: { coins: CART_REWARD, items: [] },
};

/** The end of the scene in the reeve's house (town.ts, ARGUMENT): the character heard of the raid. */
export const RAID_HEARD: QuestEffect = { id: 'raid-heard', quest: 'raid', to: 'heard' };
/** The character tells the reeve that it will warn Silverspring. */
export const RAID_ASKED: QuestEffect = { id: 'raid-asked', quest: 'raid', to: 'asked', from: ['heard'] };
