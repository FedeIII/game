import type { QuestDef, QuestEffect } from '@game/engine';

/**
 * The quests of the Wilds (the engine's quests.ts). The story is chapter 1.5.1 of Kandrax, "The
 * Razed Villages" (docs/drafts/story-razed-villages.md): a letter from Thrain Steelforge starts it,
 * and a merchant with a broken cart on the road to Ironhold is the first errand. The effects are
 * here; the dialogs (dialogs.ts) and the letter (home.ts) carry them.
 */

/** The coins that the merchant pays for the help with the cart. */
export const CART_REWARD = 10;
/** The coins that the family of Himo pays when the character brings him home (the chapter: 20 gold). */
export const HIMO_REWARD = 20;

export const ASHES: QuestDef = {
  id: 'ashes',
  title: 'The Razed Villages',
  steps: [
    {
      id: 'letter',
      journal: 'Thrain Steelforge asks me to find out who burns the homesteads of the wildlands. His letter says: begin with Elama Rothenel, the reeve of Ironhold.',
      npc: 'reeve',
    },
    // The burned homesteads (story phase 6, ruins.ts; a test checks the tiles): each one points to the next.
    {
      id: 'reeve',
      journal: 'Elama Rothenel, the reeve of Ironhold, says that three homesteads burned since the spring. Each house was searched before the fire. The nearest is the Hale homestead, north of the town.',
      at: [-29, -42],
    },
    { id: 'ruin1', journal: 'In the ashes of the Hale homestead, a phoenix is burned into a plank. Tracks lead east, to the Marrow homestead.', at: [8, -47] },
    { id: 'ruin2', journal: 'The Marrow homestead burned too, with the same phoenix. Its tracks go south-west, to the Tanner homestead.', at: [-60, -27] },
    { id: 'ruins', journal: 'Three burned homesteads, three phoenixes. The priest or the apothecary of Ironhold may know the sign.', npc: 'priest' },
    {
      id: 'symbol',
      journal: 'The priest of Ironhold calls the phoenix the sign of a god older than the gods. The apothecary says that raiders call themselves the Ashen Seekers. The stories do not agree. The priest may see more in it.',
      npc: 'priest',
    },
    // The race to the Wren homestead (story phase 7, wren.ts; a test checks the tiles): the cinder hounds
    // of the Seekers march on it from the east (source.ts, the ambush CINDERS).
    {
      id: 'next',
      journal: 'The Seekers take old things from the houses that they burn. The priest says that the Wrens, by the pool of the Silvervein, keep carved stones from the old ruins there. I must reach them before the Seekers do.',
      at: [182, -103],
    },
    { id: 'stone', journal: 'Mira Wren gave me the carved stone of her family, to take it far from her children. Something comes through the woods from the east.', at: [182, -103] },
    // Both ends point to the burned trail and the camp of the Seekers at its east end (story phase 8).
    { id: 'held', journal: 'The cinder hounds of the Seekers fell at the Wren homestead. A masked figure watched from the trees, and it was gone in a puff of ash. A burned trail leads east, into the hills.', at: [236, -100] },
    { id: 'late', journal: 'The Seekers came to the Wren homestead before me. Mira hid with her children; the Seekers took only the carved stone. A burned trail leads east, into the hills.', at: [236, -100] },
    // The camp of the Seekers (story phase 8, seekers.ts; a test checks the tiles): its guards fall, and
    // Sela is tied to its post. She sends the character to the shrine of Tigris at the pool (phase 9).
    { id: 'camp', journal: 'The guards of the camp of the Seekers fell. The camp is half packed. A woman in the robe of the Seekers is tied to a post there.', at: [240, -98] },
    {
      id: 'captive',
      journal: 'Sela, a Seeker who would not burn a family, told me what the Seekers want next: the shrine of Tigris under the pool of the Silvervein. The wave stone opens it. I must get there first.',
      // The altar of the shrine (story phase 9, shrine.ts; a test checks the tile).
      at: [195, -110],
    },
    { id: 'shrine', journal: 'The wave stone opened the altar of Tigris, and the Tear of Tigris is mine. The Seekers are here for it!', at: [195, -110] },
    {
      id: 'relic',
      journal: 'The Ash Warden went in ash, and its Seekers fell. I keep the Tear of Tigris, and the orders of the Warden. The road was long: I need a bed and a night of sleep.',
    },
    // The dream of Verath (story phase 10, dream.ts): the end of chapter 1, with the character's choice.
    {
      id: 'gave',
      journal: 'In a dream of ash, Verath Shadowweave asked me for the Tear of Tigris, and I gave it. The Seekers will not hunt me, Verath says. The four gods, Verath says, are thieves on stolen thrones.',
      end: true,
    },
    {
      id: 'refused',
      journal: 'In a dream of ash, Verath Shadowweave asked me for the Tear of Tigris, and I refused. The Seekers will come for it. The four gods, Verath says, are thieves on stolen thrones.',
      end: true,
    },
    {
      id: 'lied',
      journal: 'In a dream of ash, Verath Shadowweave asked me for the Tear of Tigris. I promised to bring it north, and I lied. Verath believes me, for now. The four gods, Verath says, are thieves.',
      end: true,
    },
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
      // The site of Silverspring at the end of the north road (road.ts, SILVERSPRING_SITE; a test checks it).
      at: [171, -179],
    },
    // The scouts wait in the grove on the north road (source.ts, the ambush SCOUTS). Then the war band
    // marches on the road to Silverspring, for each party (story phase 4b, the ambush BAND).
    {
      id: 'scouts',
      journal: 'I killed the scouts of the hobgoblins in the grove. Their war band marches on Silverspring along the north road. If I catch it on the road, Himo may still live.',
      at: [171, -179],
    },
    // The band fell on the road: Himo is tied to the post of its camp (camp.ts; a test checks the tile).
    { id: 'band', journal: 'The war band fell on the north road. Its camp is in the hills off the road, and Himo may be a prisoner there.', at: [92, -143] },
    // Himo follows the character (source.ts, the escort HIMO) to Ironhold (its gate, town.ts: TOWN_GATE).
    { id: 'escort', journal: 'Himo is free. I must take Himo home to Ironhold, through the woods.', at: [-7, 3] },
    { id: 'home', journal: 'Himo is home in Ironhold, and his family paid me. Silverspring must hear that the war band is dead.', npc: 'kasmut' },
    { id: 'lost', journal: 'Himo fell on the way home. The war band is dead all the same: Silverspring must hear of it.', npc: 'kasmut' },
    // The band came to Silverspring first: the raid on the town (story phase 4c, the ambush RAID).
    { id: 'raid', journal: 'The war band came to Silverspring before me. The hobgoblins attack the town!', at: [192, -179] },
    { id: 'defended', journal: 'The war band fell in the streets of Silverspring. Himo died in its camp, the panners say. Kasmut wants to see me.', npc: 'kasmut' },
    { id: 'title', journal: 'Silverspring gave me a title in its guard, and a bed in the town.', end: true },
  ],
};

/** The coins of a caravan that a character saves (the chapter: the Enclave thanks it, with coins and a healing draught). */
export const CARAVAN_REWARD = 15;
/** The fine that a robber of the caravan pays to the reeve of Ironhold or to Kasmut. */
export const CARAVAN_FINE_COINS = 60;

/**
 * The Caravan Ambush (chapter 1.5.1, "Asalto a la Caravana"; story phase 5): soldiers of the
 * Sovereignty send hobgoblins against a caravan of Silverspring. A character who overhears the plot
 * in the Crooked Lantern can defend the caravan, or rob it (then it is wanted until it pays a fine).
 */
export const CARAVAN: QuestDef = {
  id: 'caravan',
  title: 'The Caravan Ambush',
  steps: [
    // The meeting point: the north road, at four fifths of its length (source.ts, CARAVAN_MEET; a test checks it).
    {
      id: 'heard',
      journal: 'In the Crooked Lantern I overheard a plot: soldiers of the Sovereignty send hobgoblins against a caravan of Silverspring, half a day down the north road.',
      at: [127, -161],
    },
    { id: 'saved', journal: 'I saved the caravan of Silverspring from the hobgoblins. Its driver thanked me in the name of the Enclave.', end: true },
    { id: 'lost', journal: 'The hobgoblins broke the wagon of the caravan of Silverspring. Its cargo is lost.', end: true },
    { id: 'robbing', journal: 'I attack the caravan of Silverspring for its cargo. Ironhold and Silverspring want me for it: their guards and traders do not deal with me.' },
    { id: 'robbed', journal: 'I took the cargo of the caravan of Silverspring. I am wanted in Ironhold and Silverspring until I pay a fine to the reeve or to Kasmut.' },
    { id: 'pardoned', journal: 'I paid the fine for the caravan. Ironhold and Silverspring deal with me again.', end: true },
  ],
};

/** The quests of the Wilds, in the order of the journal. */
export const QUESTS: readonly QuestDef[] = [ASHES, CART, RAID, CARAVAN];

/** The end of the scene in the Crooked Lantern (town.ts, PLOT): the character heard of the plot. */
export const CARAVAN_HEARD: QuestEffect = { id: 'caravan-heard', quest: 'caravan', to: 'heard' };
/** Every attacker of the caravan fell, and its wagon lives. */
export const CARAVAN_SAVED: QuestEffect = { id: 'caravan-saved', quest: 'caravan', to: 'saved', from: ['heard'], give: { coins: CARAVAN_REWARD, items: [{ kind: 'draught', count: 1 }] } };
/** The attackers broke the wagon. */
export const CARAVAN_LOST: QuestEffect = { id: 'caravan-lost', quest: 'caravan', to: 'lost', from: ['heard'] };
/** The character tells the driver to hand over the cargo: its militia fight it (it is an outlaw of the caravan). */
export const CARAVAN_ROB: QuestEffect = { id: 'caravan-rob', quest: 'caravan', to: 'robbing', from: ['heard', 'saved'] };
/** The militia fell to the robber: the cargo is its (the chapter: furs, spices, and a small chest of mithril nuggets). */
export const CARAVAN_ROBBED: QuestEffect = {
  id: 'caravan-robbed',
  quest: 'caravan',
  to: 'robbed',
  from: ['robbing'],
  give: {
    coins: 20,
    items: [
      { kind: 'badger-fur', count: 3 },
      { kind: 'mithril', count: 5 },
    ],
  },
};
/** The robber pays its fine. */
export const CARAVAN_FINE: QuestEffect = { id: 'caravan-fine', quest: 'caravan', to: 'pardoned', from: ['robbing', 'robbed'], cost: CARAVAN_FINE_COINS };

/** The letter on the table of the home: to read it starts the story. */
export const READ_LETTER: QuestEffect = { id: 'read-letter', quest: 'ashes', to: 'letter' };
/** The reeve hears that Thrain sent the character. */
export const TELL_REEVE: QuestEffect = { id: 'tell-reeve', quest: 'ashes', to: 'reeve', from: ['letter'] };

/** The phoenix of each burned homestead (ruins.ts), in the order of the reeve's word and of the tracks. */
export const RUIN_HALE: QuestEffect = { id: 'ruin-hale', quest: 'ashes', to: 'ruin1', from: ['reeve'] };
export const RUIN_MARROW: QuestEffect = { id: 'ruin-marrow', quest: 'ashes', to: 'ruin2', from: ['ruin1'] };
export const RUIN_TANNER: QuestEffect = { id: 'ruin-tanner', quest: 'ashes', to: 'ruins', from: ['ruin2'] };
/** The priest or the apothecary of Ironhold tells what it knows of the phoenix. */
export const ASHES_SYMBOL: QuestEffect = { id: 'ashes-symbol', quest: 'ashes', to: 'symbol', from: ['ruins'] };

/** The coins that Mira Wren pays when the cinder hounds fall at her homestead (and a draught). */
export const WREN_REWARD = 12;
/** The priest connects the clues: the Wrens by the pool of the Silvervein are next (story phase 7). */
export const ASHES_NEXT: QuestEffect = { id: 'ashes-next', quest: 'ashes', to: 'next', from: ['symbol'] };
/** Mira Wren gives the wave stone to the character who warns her. */
export const MIRA_STONE: QuestEffect = { id: 'mira-stone', quest: 'ashes', to: 'stone', from: ['next'], give: { coins: 0, items: [{ kind: 'wave-stone', count: 1 }] } };
/** The cinder hounds fell at the Wren homestead: Mira pays. */
export const ASHES_HELD: QuestEffect = { id: 'ashes-held', quest: 'ashes', to: 'held', from: ['next', 'stone'], give: { coins: WREN_REWARD, items: [{ kind: 'draught', count: 1 }] } };
/** The hounds came to the homestead first: the Seekers took the stone. */
export const ASHES_LATE: QuestEffect = { id: 'ashes-late', quest: 'ashes', to: 'late', from: ['next'] };
/** The guards of the camp of the Seekers fell (story phase 8). */
export const CAMP_TAKEN: QuestEffect = { id: 'camp-taken', quest: 'ashes', to: 'camp', from: ['held', 'late'] };
/** The character cuts the ropes of Sela, at the post of the camp. */
export const SELA_FREE: QuestEffect = { id: 'sela-free', quest: 'ashes', to: 'captive', from: ['camp'] };
/** The chest of the camp gives the wave stone back to a character who has none (the quest stays at its step). */
export const STONE_BACK: QuestEffect = { id: 'stone-back', quest: 'ashes', from: ['camp', 'captive'], give: { coins: 0, items: [{ kind: 'wave-stone', count: 1 }] } };
/** The character puts the wave stone into the altar of the shrine of Tigris, and takes the Tear (story phase 9). */
export const TEAR_TAKEN: QuestEffect = {
  id: 'tear-taken',
  quest: 'ashes',
  to: 'shrine',
  from: ['captive'],
  take: [{ kind: 'wave-stone', count: 1 }],
  give: { coins: 0, items: [{ kind: 'tear-of-tigris', count: 1 }] },
};
/** The Ash Warden went in ash and its Seekers fell at the shrine: its orders are the character's. */
export const ASHES_RELIC: QuestEffect = { id: 'ashes-relic', quest: 'ashes', to: 'relic', from: ['shrine'], give: { coins: 0, items: [{ kind: 'warden-orders', count: 1 }] } };
/** The dream of Verath (story phase 10): the character gives the Tear (from its pack or its neck), refuses, or lies. */
export const DREAM_GIVE: QuestEffect = { id: 'dream-give', quest: 'ashes', to: 'gave', from: ['relic'], take: [{ kind: 'tear-of-tigris', count: 1 }] };
export const DREAM_REFUSE: QuestEffect = { id: 'dream-refuse', quest: 'ashes', to: 'refused', from: ['relic'] };
export const DREAM_LIE: QuestEffect = { id: 'dream-lie', quest: 'ashes', to: 'lied', from: ['relic'] };
/** Mira gives the stone after the fight to a character who has none (it fought the hounds before it warned her, or lost the stone). */
export const MIRA_STONE_AFTER: QuestEffect = { id: 'mira-stone-after', quest: 'ashes', to: 'held', from: ['held'], give: { coins: 0, items: [{ kind: 'wave-stone', count: 1 }] } };

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

/** The end of the ambush in the grove: the scouts fell. Their packs had badger furs. */
export const RAID_SCOUTS: QuestEffect = { id: 'raid-scouts', quest: 'raid', to: 'scouts', from: ['asked'], give: { coins: 0, items: [{ kind: 'badger-fur', count: 2 }] } };
/** The war band fell on the north road, before it came to Silverspring. */
export const RAID_BAND: QuestEffect = { id: 'raid-band', quest: 'raid', to: 'band', from: ['scouts'] };
/** The war band came to the gate of Silverspring first: the raid begins. */
export const RAID_ARRIVED: QuestEffect = { id: 'raid-arrived', quest: 'raid', to: 'raid', from: ['scouts'] };
/** The character cuts the ropes of Himo at the post of the camp (camp.ts). */
export const HIMO_FREE: QuestEffect = { id: 'himo-free', quest: 'raid', to: 'escort', from: ['band'] };
/** Himo comes home to Ironhold with the character: his family pays. */
export const HIMO_HOME: QuestEffect = { id: 'himo-home', quest: 'raid', to: 'home', from: ['escort'], give: { coins: HIMO_REWARD, items: [] } };
/** Himo falls on the way home. */
export const HIMO_LOST: QuestEffect = { id: 'himo-lost', quest: 'raid', to: 'lost', from: ['escort'] };
/** The war band fell in the streets of Silverspring. */
export const RAID_DEFENDED: QuestEffect = { id: 'raid-defended', quest: 'raid', to: 'defended', from: ['raid'] };
/**
 * Kasmut gives the title in the guard of Silverspring (the flag `title`; the bed at the Silver Trout
 * goes with it). When the band fell on the road, before the town knew of it, she also gives the
 * permit of Silverspring: the jeweller sells mithril to the character at cost (the chapter).
 */
export const RAID_TITLE_PERMIT: QuestEffect = {
  id: 'raid-title-permit',
  quest: 'raid',
  to: 'title',
  from: ['home', 'lost'],
  flag: 'permit',
  give: { coins: 0, items: [{ kind: 'mithril-permit', count: 1 }] },
};
export const RAID_TITLE: QuestEffect = { id: 'raid-title', quest: 'raid', to: 'title', from: ['defended'] };
