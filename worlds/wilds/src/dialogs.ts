import type { Dialog, Gate, ItemKind } from '@game/engine';
import { ASHES_NEXT, ASHES_SYMBOL, CARAVAN_FINE, DREAM_GIVE, DREAM_LIE, DREAM_REFUSE, MIRA_STONE, MIRA_STONE_AFTER, SELA_FREE, CARAVAN_ROB, CART_HELP, CART_LEVER, CART_LIFT, CART_MEND, FARMER_LEVER, LENTILS_GIVE, LENTILS_TAKE, RAID_ASKED, RAID_TITLE, RAID_TITLE_PERMIT, ROAD_DONE, START_ASHES, TELL_REEVE } from './quests.ts';

/**
 * Mithril (story phase 4d): the jeweller of Silverspring sells a nugget for MITHRIL_COST to a
 * character with the permit of Silverspring, and the smith of Ironhold pays MITHRIL_PRICE for it
 * (the chapter: bought at cost, sold elsewhere for up to two and a half times as much).
 */
export const MITHRIL_COST = 5;
export const MITHRIL_PRICE = 10;

/**
 * The conversations of the people of Ironhold (town.ts) and of Silverspring (silverspring.ts): what
 * each one says, and what the player can answer (see the engine's dialog.ts). Every node has a way out; a test checks each
 * dialog with checkDialog().
 */

const BYE = { text: 'Goodbye.' } as const;

/** The gate of lore: Intelligence 13 (pages on things, answers in conversations). */
export const LORE_GATE: Gate = { ability: 'int', min: 13 };
/** The gate of insight: Wisdom 13 (answers that see what a person hides). */
export const INSIGHT_GATE: Gate = { ability: 'wis', min: 13 };
/** A keen ear: Wisdom 15 (the first lines of the plot in the Crooked Lantern). */
export const KEEN_GATE: Gate = { ability: 'wis', min: 15 };

/**
 * A character who robbed the caravan of Silverspring (quests.ts, caravan; story phase 5) is wanted:
 * the guards and the traders of Ironhold and Silverspring do not deal with it (Dialog.refuse), until
 * it pays its fine to the reeve or to Kasmut.
 */
const WANTED = { quest: 'caravan', at: ['robbing', 'robbed'] } as const;
/** A person who refuses a wanted character starts at its node `wanted` (Dialog.refuse), with its line. */
const REFUSE = { when: WANTED, node: 'wanted' } as const;
const wanted = (say: string) => ({ say, answers: [{ text: 'I will go.' }] }) as const;
/** The gate of athletics: Strength 13 (answers that lift or push what is heavy). */
export const ATHLETICS_GATE: Gate = { ability: 'str', min: 13 };
/** The gate of persuasion: Charisma 13 (answers that win a person over). */
export const PERSUASION_GATE: Gate = { ability: 'cha', min: 13 };

/** Brann, the watchman at the gate: the first person a traveller from the hut meets. */
export const WATCHMAN: Dialog = {
  name: 'Brann, the watchman',
  start: 'halt',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('I know your face: the robber of the caravan of Silverspring. Pay your fine to the reeve. Until then, I have nothing to say to you.'),
    halt: {
      say: 'Halt! Who walks the road at night?',
      answers: [
        { text: 'A traveller, from the hut in the woods.', next: 'traveller' },
        { text: 'Who are you?', next: 'who' },
        { text: 'What is this place?', next: 'place' },
        { text: 'Nobody. Goodbye.' },
      ],
    },
    traveller: {
      say: 'The hut by the old signpost? Then you walked the road alone. Brave, or a fool.',
      answers: [
        { text: 'What is out there in the woods?', next: 'woods' },
        { text: 'Can I come in?', next: 'enter' },
        BYE,
      ],
    },
    who: {
      say: 'Brann, of the town watch. The whole watch, these days. The others went south.',
      answers: [{ text: 'Why did they leave?', next: 'south' }, { text: 'What is this place?', next: 'place' }, BYE],
    },
    place: {
      say: 'Ironhold. An inn, a forge, a chapel, and more empty houses every year.',
      answers: [{ text: 'Where should I go first?', next: 'advice' }, { text: 'What is out there in the woods?', next: 'woods' }, BYE],
    },
    woods: {
      say: 'Imps, quick as cats. And the big grey ones with clubs. They never come past the lamps.',
      answers: [{ text: 'Why not?', next: 'lamps' }, { text: 'I will be careful.' }],
    },
    lamps: {
      say: 'The priest says it is the chapel candles. I say: do not ask. Just keep them lit.',
      answers: [{ text: 'Can I come in?', next: 'enter' }, { text: 'You do not believe the priest.', next: 'believe', gate: INSIGHT_GATE }, BYE],
    },
    believe: {
      say: 'No. One winter the candles went out for a week, and the imps still stayed away. Something else keeps them out.',
      answers: [{ text: 'Can I come in?', next: 'enter' }, BYE],
    },
    enter: {
      say: 'The gate is open to anyone who is not an imp. Welcome to Ironhold.',
      answers: [
        { text: 'Where should I go first?', next: 'advice' },
        { text: 'You look like a man who needs a drink. The next one is on me.', next: 'treat', gate: PERSUASION_GATE },
        { text: 'Thank you.' },
      ],
    },
    treat: {
      say: 'Ha! A traveller with manners. Then hear this: the grey brutes are slow. Walk away from them. Never run blind into the dark.',
      answers: [{ text: 'Thank you.' }],
    },
    south: {
      say: 'The roads went bad, the trade stopped, and the families followed the trade. Some of us stayed.',
      answers: [{ text: 'Why did you stay?', next: 'stay' }, BYE],
    },
    stay: {
      say: 'Somebody has to light the lamps.',
      answers: [{ text: 'What is this place?', next: 'place' }, BYE],
    },
    advice: {
      say: 'The Crooked Lantern, for a fire and a drink. The apothecary, if the woods have marked you.',
      answers: [{ text: 'Thank you.' }],
    },
  },
};

/** An ale at the Crooked Lantern: 2 coins (less with Charisma), and the walk sways for a while (the engine's ALE_TICKS). */
const ALE = { id: 'ale', goods: 'ale', price: 2, poor: 'poor' } as const;
/** A room at the inn, for a character who wins Marta over: the inn becomes its refuge, and the bed there rests it. */
const ROOM = { id: 'room', goods: 'refuge', refuge: 'inn', price: 0, poor: 'room' } as const;

/** Marta, who keeps the Crooked Lantern. */
export const INNKEEPER: Dialog = {
  name: 'Marta, the innkeeper',
  start: 'welcome',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('I do not serve thieves. Pay your fine to the reeve, and then we talk.'),
    welcome: {
      say: 'Welcome to the Crooked Lantern! Sit down before you fall down.',
      answers: [
        { text: 'What do you have to drink?', next: 'drink' },
        { text: 'Do you have a room?', next: 'room' },
        { text: 'Any news?', next: 'news' },
        { text: 'Not now.' },
      ],
    },
    drink: {
      say: 'Ale, cheap and brown. Cider, cheap and yellow. And something green that the apothecary makes.',
      answers: [{ text: 'The ale, then.', next: 'ale', deal: ALE }, { text: 'What is the green one?', next: 'green' }, { text: 'Nothing for me.' }],
    },
    ale: {
      say: 'Here. Do not tell me what you think of it. Everybody tells me.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'Thank you.' }],
    },
    poor: {
      say: 'An ale costs coin. Come back when the woods have paid you.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'I will.' }],
    },
    green: {
      say: 'Nobody knows. It warms you, and then it remembers you. I stopped asking.',
      answers: [{ text: 'The ale, then.', next: 'ale', deal: ALE }, { text: 'You know what is in it.', next: 'knows', gate: INSIGHT_GATE }, BYE],
    },
    knows: {
      say: 'Ashroot, and a pinch from the green jar. Isolde told me once. I wish she had not.',
      answers: [{ text: 'The ale, then.', next: 'ale', deal: ALE }, BYE],
    },
    room: {
      say: 'The beds are taken. Folk from the farms sleep here now. The farms are too close to the trees.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'Surely there is a corner for a friendly face?', next: 'corner', deal: ROOM, gate: PERSUASION_GATE }, BYE],
    },
    corner: {
      say: 'Ha! For that smile... The bed by the east wall is yours when you need it. If the woods knock you down, wake up here, not out there.',
      answers: [{ text: 'Thank you, Marta.' }],
    },
    news: {
      say: 'The minstrel knows only sad songs, the reeve writes letters that nobody answers, and the smith works all night.',
      answers: [{ text: 'Why all night?', next: 'smith' }, BYE],
    },
    smith: {
      say: 'Ask him. He says the woods grow thicker every year. More blades, fewer nails.',
      answers: [{ text: 'What do you have to drink?', next: 'drink' }, BYE],
    },
  },
};

/** A draught that Isolde sells, for coins (less with Charisma); a friend's price is behind persuasion. */
const remedy = (id: string, text: string, goods: 'draught' | 'antidote' | 'strong-draught', price: number, gate?: Gate) =>
  ({ text, next: 'bought', ...(gate ? { gate } : {}), deal: { id, goods, price, poor: 'broke' } }) as const;

/** Isolde, the apothecary. */
export const APOTHECARY: Dialog = {
  name: 'Isolde, the apothecary',
  start: 'careful',
  refuse: REFUSE,
  // A character who found the three burned homesteads (quests.ts, ashes at `ruins`): her story of the phoenix.
  starts: [{ when: { quest: 'ashes', at: ['ruins'] }, node: 'phoenix' }],
  nodes: {
    wanted: wanted('My remedies are not for robbers. Pay your fine to the reeve first.'),
    phoenix: {
      say: 'You smell of smoke. The burned homesteads? Everybody talks of them.',
      answers: [{ text: 'A phoenix is burned into each of them. Do you know the sign?', next: 'raiders', effect: ASHES_SYMBOL }, { text: 'Something else.', next: 'careful' }, BYE],
    },
    raiders: {
      say: 'Travellers say that raiders from the south leave it: cutthroats who call themselves the Ashen Seekers. They burn the houses to hide what they steal.',
      answers: [{ text: 'Is that all that people say?', next: 'rumours' }, BYE],
    },
    rumours: {
      say: 'Some say they are monks, some say ghosts. A peddler swore to me that they pay in coins older than the Sovereignty. Nobody agrees.',
      answers: [BYE],
    },
    careful: {
      say: 'Careful with that shelf. Half of it heals and half of it kills.',
      answers: [
        { text: 'Which half is which?', next: 'halves' },
        { text: 'Do you sell remedies?', next: 'shop' },
        { text: 'Do you have something for wounds?', next: 'wounds' },
        { text: 'I will not touch anything.' },
      ],
    },
    halves: {
      say: 'The labels say. Unless they fell off. Some of them fell off.',
      answers: [
        { text: 'What do you know of the imps?', next: 'imps' },
        { text: "Then I need a friend who knows the labels. A friend's price, perhaps?", next: 'friend', gate: PERSUASION_GATE },
        BYE,
      ],
    },
    shop: {
      say: 'Draughts for wounds, for poison, and for worse. Coin first.',
      answers: [remedy('buy-draught', 'A healing draught.', 'draught', 6), remedy('buy-antidote', 'An antidote.', 'antidote', 8), remedy('buy-strong', 'A strong draught.', 'strong-draught', 15), { text: 'Not now.' }],
    },
    friend: {
      say: "Ha. You talk like a peddler. For you, a friend's price.",
      answers: [
        remedy('friend-draught', 'A healing draught.', 'draught', 4, PERSUASION_GATE),
        remedy('friend-antidote', 'An antidote.', 'antidote', 6, PERSUASION_GATE),
        remedy('friend-strong', 'A strong draught.', 'strong-draught', 11, PERSUASION_GATE),
        { text: 'Not now.' },
      ],
    },
    bought: {
      say: 'Drink it before you need it, not after.',
      answers: [{ text: 'Something else.', next: 'careful' }, { text: 'Thank you.' }],
    },
    broke: {
      say: 'Coin first, and room in your pack for the bottle.',
      answers: [{ text: 'Something else.', next: 'careful' }, BYE],
    },
    wounds: {
      say: 'Ashroot, for cuts. Salt, for a scratch from an imp. Wash it, and then wash it again.',
      answers: [
        { text: 'Why salt?', next: 'salt' },
        { text: 'Could I brew a remedy myself?', next: 'brew', gate: LORE_GATE },
        { text: 'You do not grow your ashroot here. Where do you find it?', next: 'ashroot', gate: INSIGHT_GATE },
        { text: 'Thank you.' },
      ],
    },
    ashroot: {
      say: 'You have a good eye. It grows wild, low between the trees. Most people walk over it and never see it.',
      answers: [{ text: 'Thank you.' }],
    },
    brew: {
      say: 'You have the head for it. Use my cauldron, if you bring your own herbs. Two bundles make a draught for wounds.',
      answers: [{ text: 'And for poison?', next: 'antidote' }, { text: 'Thank you.' }],
    },
    antidote: {
      say: 'Herbs, and the horn of an imp: what bites you also cures you. The strong draught needs a brute\'s tusk. Do not ask how I know.',
      answers: [{ text: 'Thank you.' }],
    },
    salt: {
      say: 'Their claws are dirty. And the old women say that the woods do not like salt. Both can be true.',
      answers: [{ text: 'What do you know of the imps?', next: 'imps' }, BYE],
    },
    imps: {
      say: 'They come out of the dark under the trees, and they hate the light. I cut one open once. It was mostly smoke.',
      answers: [{ text: 'Mostly smoke?', next: 'smoke' }, BYE],
    },
    smoke: {
      say: 'Smoke, and teeth. I keep the teeth in the green jar. Do not touch the green jar.',
      answers: [{ text: 'I will not.' }],
    },
  },
};

/** Elama Rothenel, the reeve: she runs what is left of the town (Fede's choice of the name, 2026-10-11). */
export const REEVE: Dialog = {
  name: 'Elama Rothenel, the reeve',
  start: 'reeve',
  // A character who heard the argument in her house (town.ts, ARGUMENT; quests.ts, raid), or who
  // goes to warn Silverspring; else a character with the letter of Thrain Steelforge (ashes).
  starts: [
    // A character who robbed the caravan pays its fine here (quests.ts, CARAVAN_FINE).
    { when: WANTED, node: 'fine' },
    { when: { quest: 'raid', at: ['heard'] }, node: 'warn' },
    { when: { quest: 'raid', at: ['asked'] }, node: 'go' },
    { when: { quest: 'raid', at: ['home'] }, node: 'himo' },
    { when: { quest: 'raid', at: ['lost'] }, node: 'himo-lost' },
    { when: { quest: 'ashes', at: ['letter'] }, node: 'letter' },
    // A character that came by the road from its hut (quests.ts, ROAD): its arrival lets her tell of the burned homesteads.
    { when: [ROAD_DONE, { quest: 'ashes', not: true }], node: 'letter' },
  ],
  nodes: {
    fine: {
      say: 'You robbed the caravan of Silverspring. No trader of Ironhold deals with you until you pay the fine: sixty coins.',
      answers: [{ text: 'I will pay the fine.', next: 'paid', effect: CARAVAN_FINE }, { text: 'Not now.' }],
    },
    paid: {
      say: 'Paid. The traders of Ironhold will deal with you again. Do not do it twice.',
      answers: [BYE],
    },
    himo: {
      say: 'Himo is home! His mother has not slept for a week. Ironhold owes you more than it can pay.',
      answers: [{ text: 'His family paid me.', next: 'family' }, { text: 'Tell me about the town.', next: 'reeve' }, BYE],
    },
    family: {
      say: 'Good people. Now go to Silverspring, and tell them that the war band is dead. They will want to hear it from you.',
      answers: [BYE],
    },
    'himo-lost': {
      say: 'Himo... fell? So close to home? ...I will tell his mother myself. It is my work.',
      answers: [{ text: 'I am sorry.' }],
    },
    warn: {
      say: 'You heard it. Hobgoblins in the hills, on the way to Silverspring. Somebody must warn them, and the soldiers will not go.',
      answers: [
        { text: 'I will warn Silverspring.', next: 'thanks', effect: RAID_ASKED },
        { text: 'Thrain Steelforge sent me. Who burns the homesteads?', next: 'burned', effect: TELL_REEVE },
        { text: 'Why will the soldiers not go?', next: 'soldiers' },
        { text: 'Not now.' },
      ],
    },
    soldiers: {
      say: 'They are soldiers of the Sovereignty, not of Ironhold. They say that they guard the town. I say that they guard the Sovereignty.',
      answers: [{ text: 'I will warn Silverspring.', next: 'thanks', effect: RAID_ASKED }, BYE],
    },
    thanks: {
      say: 'Thank you. Ironhold cannot pay you, I am sorry. Silverspring is north-east of here, over the hills. Do not fight the hobgoblins: they are many.',
      answers: [{ text: 'Who are Himo and Brys?', next: 'scouts' }, BYE],
    },
    scouts: {
      say: 'Our scouts. They watch the hills for us. Brys came back alone last night. Himo... we do not know.',
      answers: [BYE],
    },
    go: {
      say: 'Silverspring is north-east of here, over the hills. Go, and be careful.',
      answers: [
        { text: 'Who are Himo and Brys?', next: 'scouts' },
        { text: 'Thrain Steelforge sent me. Who burns the homesteads?', next: 'burned', effect: TELL_REEVE },
        { text: 'Tell me about the town.', next: 'reeve' },
        BYE,
      ],
    },
    letter: {
      say: 'I am the reeve of Ironhold. Of what is left of it. You look like somebody with business here.',
      answers: [
        { text: 'Thrain Steelforge sent me. Who burns the homesteads?', next: 'burned', effect: TELL_REEVE },
        { text: 'Thrain Steelforge sent me. Who burns the homesteads?', next: 'burned', effect: START_ASHES, when: ROAD_DONE },
        { text: 'No business. What happened to the town?', next: 'happened' },
        BYE,
      ],
    },
    burned: {
      say: 'Steelforge sent you? Good. Three homesteads burned since the spring. Nobody saw who burned them.',
      answers: [{ text: 'What else do you know?', next: 'searched' }, { text: 'You fear that it is more than bandits.', next: 'fear', gate: INSIGHT_GATE }, BYE],
    },
    searched: {
      say: 'Every house was searched before the fire. The chests, the floors, even the hearths. Whoever it is, they look for something.',
      answers: [{ text: 'Where are the homesteads?', next: 'where' }, { text: 'I will find out who.' }],
    },
    where: {
      say: 'The nearest is the Hale homestead, north of the town. Old Hale would not leave the ashes. Start there.',
      answers: [{ text: 'I will find out who.' }],
    },
    fear: {
      say: 'Bandits take the coins and run. These leave the coins, and take the time to burn. That is not hunger.',
      answers: [{ text: 'What else do you know?', next: 'searched' }, BYE],
    },
    reeve: {
      say: 'I am the reeve of Ironhold. Of what is left of it.',
      answers: [
        { text: 'What happened to the town?', next: 'happened' },
        { text: 'Who lived in the shut houses?', next: 'shut' },
        { text: 'What is that map?', next: 'map' },
        BYE,
      ],
    },
    happened: {
      say: 'The woods came closer, the roads went bad, and four houses shut this year. The families went south.',
      answers: [{ text: 'Will they come back?', next: 'back' }, BYE],
    },
    back: {
      say: 'I write to them every week. Nobody has written back. Yet.',
      answers: [{ text: 'Who lived in the shut houses?', next: 'shut' }, BYE],
    },
    shut: {
      say: 'The chandler, an old couple, a family I hardly knew. And the granary... the granary is another matter.',
      answers: [{ text: 'What about the granary?', next: 'granary' }, { text: 'You miss the old couple.', next: 'couple', gate: INSIGHT_GATE }, BYE],
    },
    couple: {
      say: 'I do. They never trusted my strongbox. They buried their savings across the lane from their door, a few steps to the west.',
      answers: [{ text: 'Nobody dug it up?', next: 'dug' }, BYE],
    },
    dug: {
      say: 'Not I. It is theirs, if they come back. If you find it... I did not tell you.',
      answers: [BYE],
    },
    granary: {
      say: 'It is barred from the inside. We do not know who barred it. We do not open it.',
      answers: [{ text: 'Why not?', next: 'why' }, { text: 'Your ledgers say that grain went in all summer, and none came out.', next: 'grain', gate: LORE_GATE }, BYE],
    },
    grain: {
      say: '...You read my ledgers. Then you know why I do not open it. Something in there eats.',
      answers: [BYE],
    },
    why: {
      say: 'Because I am the reeve, and I say so. ...And because something in there scratches at night.',
      answers: [{ text: 'You can tell me. I keep secrets.', next: 'secret', gate: PERSUASION_GATE }, BYE],
    },
    secret: {
      say: '...The last reeve went into the granary with a lamp. The lamp came back out. He did not.',
      answers: [BYE],
    },
    map: {
      say: 'The valley. The woods are inked black, and every year I ink a little more of it.',
      answers: [{ text: 'What happened to the town?', next: 'happened' }, { text: 'The marks in the black: are they the boarded houses?', next: 'marks', gate: LORE_GATE }, BYE],
    },
    marks: {
      say: 'You read a map well. Yes. The families boarded their doors and left their strongboxes inside. Strong arms could open them. I did not say that.',
      answers: [{ text: 'What happened to the town?', next: 'happened' }, BYE],
    },
  },
};

/** A recipe of the cauldron: what it takes from the pack, what it makes, and the Intelligence that it needs. */
const brew = (id: 'draught' | 'antidote' | 'strong-draught', text: string, min: number, items: readonly { kind: 'herbs' | 'imp-horn' | 'brute-tusk'; count: number }[]) =>
  ({ text, next: 'brewed', gate: { ability: 'int', min }, deal: { id, goods: id, price: 0, items, poor: 'short' } }) as const;

/**
 * The cauldron of Isolde, the apothecary: a conversation with the pot, whose answers are its
 * recipes (Intelligence 10, 13 and 15; Fede's choice, 2026-10-10). Each one takes items from the
 * pack and puts a draught in it (dialog.ts, Deal).
 */
export const CAULDRON: Dialog = {
  name: 'The cauldron',
  start: 'pot',
  nodes: {
    pot: {
      say: 'The cauldron bubbles. Isolde lets you use it, if you bring your own herbs.',
      answers: [
        brew('draught', 'Brew a healing draught (2 bundles of herbs).', 10, [{ kind: 'herbs', count: 2 }]),
        brew('antidote', 'Brew an antidote (herbs and an imp horn).', 13, [
          { kind: 'herbs', count: 1 },
          { kind: 'imp-horn', count: 1 },
        ]),
        brew('strong-draught', 'Brew a strong draught (2 herbs and a brute tusk).', 15, [
          { kind: 'herbs', count: 2 },
          { kind: 'brute-tusk', count: 1 },
        ]),
        { text: 'Leave it.' },
      ],
    },
    brewed: {
      say: 'The brew turns clear. You fill a small bottle and put it in your pack.',
      answers: [{ text: 'Brew another.', next: 'pot' }, { text: 'Leave it.' }],
    },
    short: {
      say: 'You do not have what the brew needs, or your pack has no room for the bottle.',
      answers: [{ text: 'Look again.', next: 'pot' }, { text: 'Leave it.' }],
    },
  },
};

/** Something that the peddler buys: the player gives one and gets coins (more with Charisma). */
/**
 * What the smith asks for armour, shields and weapons (gear.ts), in coins, before Charisma. A draught
 * costs 6 coins: leather is cheap, plate is the work of a season. The smith buys each one back for
 * half of it (5e: a sale gives half the price), at least 1 coin.
 */
export const SMITH_PRICES = {
  'leather-armour': 5,
  'studded-leather': 10,
  'scale-mail': 12,
  'chain-mail': 18,
  'splint-armour': 45,
  'plate-armour': 150,
  shield: 4,
  longsword: 6,
  shortsword: 4,
  rapier: 8,
  greataxe: 10,
  glaive: 8,
  mace: 3,
  longbow: 12,
  'arcane-staff': 4,
  'druid-staff': 4,
} as const satisfies Partial<Record<ItemKind, number>>;
type SmithWare = keyof typeof SMITH_PRICES;

/** What the smith pays for a piece of gear: half of the price, at least 1 coin. */
export function smithPays(kind: SmithWare): number {
  return Math.max(1, Math.floor(SMITH_PRICES[kind] / 2));
}

const forge = (kind: SmithWare, text: string) => ({ text, next: 'forged', deal: { id: `buy-${kind}`, goods: kind, price: SMITH_PRICES[kind], poor: 'short' } }) as const;
const scrap = (kind: SmithWare, text: string) =>
  ({ text, next: 'scrapped', deal: { id: `sell-${kind}`, goods: 'coins', price: 0, pay: smithPays(kind), items: [{ kind, count: 1 }], poor: 'none' } }) as const;

/**
 * The smith of Ironhold: armour, a shield and weapons for sale (not the staffs: wood is not his
 * trade), and he buys them all back for half of the price. He buys only what is in the pack: a
 * worn item must come off first.
 */
export const SMITH: Dialog = {
  name: 'The smith',
  start: 'forge',
  refuse: REFUSE,
  // A character who helps the merchant on the road (quests.ts, cart), without a lever.
  starts: [
    { when: [{ quest: 'cart', at: ['met', 'lever', 'lent'] }, { has: 'crowbar', not: true }], node: 'cart' },
    // Mithril of Silverspring in the pack (story phase 4d): Ironhold wants it.
    { when: { has: 'mithril' }, node: 'mithril' },
  ],
  nodes: {
    wanted: wanted('No iron for a thief. Pay the reeve your fine.'),
    mithril: {
      say: 'Is that mithril in your pack? From Silverspring? I pay you ten coins a nugget, and I ask no questions.',
      answers: [
        { text: 'One nugget, then.', next: 'mithril-sold', deal: { id: 'sell-mithril', goods: 'coins', price: 0, pay: MITHRIL_PRICE, items: [{ kind: 'mithril', count: 1 }], poor: 'none' } },
        { text: 'Something else.', next: 'forge' },
        BYE,
      ],
    },
    'mithril-sold': {
      say: 'Light as a feather, and harder than my anvil. Bring me more.',
      answers: [
        { text: 'Another one.', next: 'mithril-sold', deal: { id: 'sell-mithril', goods: 'coins', price: 0, pay: MITHRIL_PRICE, items: [{ kind: 'mithril', count: 1 }], poor: 'none' } },
        { text: 'That is all.' },
      ],
    },
    cart: {
      say: 'Mind the forge. It bites. You look like somebody who needs iron.',
      answers: [
        { text: 'A merchant on the road needs a lever for a broken cart.', next: 'lever', effect: CART_LEVER, when: { has: 'crowbar', not: true } },
        { text: 'Something else.', next: 'forge' },
        BYE,
      ],
    },
    lever: {
      say: 'A cart in the mud, on that road? Take this lever. Tell the merchant that my forge sells nails too.',
      answers: [{ text: 'Thank you.' }],
    },
    forge: {
      say: 'Mind the forge. It bites. I sell iron, and I buy it back when you do not need it.',
      answers: [
        { text: 'Show me armour.', next: 'armour' },
        { text: 'Show me weapons.', next: 'weapons' },
        { text: 'I have gear to sell.', next: 'sell' },
        BYE,
      ],
    },
    armour: {
      say: 'Leather for the quick, steel for the stubborn.',
      answers: [forge('leather-armour', 'Leather armour.'), forge('studded-leather', 'Studded leather.'), forge('scale-mail', 'Scale mail.'), { text: 'Something heavier.', next: 'heavy' }],
    },
    heavy: {
      say: 'Heavy iron. It stops a tusk, and it slows the feet that carry it.',
      answers: [forge('chain-mail', 'Chain mail.'), forge('splint-armour', 'Splint armour.'), forge('plate-armour', 'Plate armour.'), { text: 'And a shield?', next: 'shield' }],
    },
    shield: {
      say: 'Oak, and a rim of iron. It turns more blows than you think.',
      answers: [forge('shield', 'A shield.'), { text: 'Something else.', next: 'forge' }, BYE],
    },
    weapons: {
      say: 'Every blade in Ironhold has been through my hands twice. These are new.',
      answers: [forge('longsword', 'A longsword.'), forge('shortsword', 'A shortsword.'), forge('rapier', 'A rapier.'), { text: 'Something heavier.', next: 'heavier' }],
    },
    heavier: {
      say: 'An axe for the strong, a glaive to keep the claws away, a mace for the plain.',
      answers: [forge('greataxe', 'A greataxe.'), forge('glaive', 'A glaive.'), forge('mace', 'A mace.'), { text: 'And a bow?', next: 'bow' }],
    },
    bow: {
      say: 'A traveller left a longbow for its price. Yew, and a good string.',
      answers: [forge('longbow', 'The longbow.'), { text: 'Something else.', next: 'forge' }, BYE],
    },
    sell: {
      say: 'I pay half of what I ask. Iron is iron. What is it?',
      answers: [{ text: 'Armour or a shield.', next: 'sell-armour' }, { text: 'A weapon or a staff.', next: 'sell-weapon' }, { text: 'Something else.', next: 'forge' }, BYE],
    },
    'sell-armour': {
      say: 'Put it on the bench. Light or heavy?',
      answers: [scrap('leather-armour', 'Leather armour.'), scrap('studded-leather', 'Studded leather.'), scrap('scale-mail', 'Scale mail.'), { text: 'Something heavier.', next: 'sell-heavy' }],
    },
    'sell-heavy': {
      say: 'Heavy, then. Let me see the rings and the rivets.',
      answers: [scrap('chain-mail', 'Chain mail.'), scrap('splint-armour', 'Splint armour.'), scrap('plate-armour', 'Plate armour.'), { text: 'A shield.', next: 'sell-shield' }],
    },
    'sell-shield': {
      say: 'A shield. Dented, I suppose.',
      answers: [scrap('shield', 'A shield.'), { text: 'Something else.', next: 'sell' }, { text: 'Nothing now.' }],
    },
    'sell-weapon': {
      say: 'A blade? Let me see the edge.',
      answers: [scrap('longsword', 'A longsword.'), scrap('shortsword', 'A shortsword.'), scrap('rapier', 'A rapier.'), { text: 'Something else.', next: 'sell-weapon-2' }],
    },
    'sell-weapon-2': {
      say: 'Heavier work. Let me feel the weight.',
      answers: [scrap('greataxe', 'A greataxe.'), scrap('glaive', 'A glaive.'), scrap('mace', 'A mace.'), { text: 'A bow or a staff.', next: 'sell-wood' }],
    },
    'sell-wood': {
      say: 'Wood. I burn it in the forge, but I pay for it.',
      answers: [scrap('longbow', 'A longbow.'), scrap('arcane-staff', 'An arcane staff.'), scrap('druid-staff', 'A druid staff.'), { text: 'Nothing now.' }],
    },
    forged: {
      say: 'Wear it well. Come back when it breaks.',
      answers: [{ text: 'Something else.', next: 'forge' }, { text: 'Thank you.' }],
    },
    short: {
      say: 'Coin first, and room in your pack for it.',
      answers: [{ text: 'Something else.', next: 'forge' }, BYE],
    },
    scrapped: {
      say: 'Iron is iron. Here is your coin.',
      answers: [{ text: 'Something else.', next: 'sell' }, { text: 'That is all.' }],
    },
    none: {
      say: 'I see none in your pack. If you wear it, take it off first.',
      answers: [{ text: 'Something else.', next: 'sell' }, BYE],
    },
  },
};

const sell = (id: string, text: string, kind: 'ring' | 'cup' | 'candle' | 'imp-horn' | 'brute-tusk' | 'badger-fur', pay: number) =>
  ({ text, next: 'sold', deal: { id, goods: 'coins', price: 0, pay, items: [{ kind, count: 1 }], poor: 'none' } }) as const;

/**
 * Corwin, the peddler of the main street: he buys the trinkets of the houses and the trophies of
 * the woods (Fede's prices, 2026-10-10). Charisma gets more for them (PlayerTraits.sellShare).
 */
export const PEDDLER: Dialog = {
  name: 'Corwin, the peddler',
  start: 'wares',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('Even I do not buy from the robber of a caravan. Pay your fine to the reeve.'),
    wares: {
      say: 'Pots! Pins! Candles! Well... I had candles. I buy what the woods give you.',
      answers: [
        { text: 'What do you buy?', next: 'trinkets' },
        { text: 'Do you buy trophies?', next: 'trophies' },
        { text: 'Why do you not sell candles?', next: 'candles' },
        BYE,
      ],
    },
    trinkets: {
      say: 'Rings, cups, candle stubs. Things that people leave behind when they go south.',
      answers: [sell('sell-ring', 'A silver ring.', 'ring', 5), sell('sell-cup', 'A pewter cup.', 'cup', 3), sell('sell-candle', 'A candle stub.', 'candle', 1), { text: 'Nothing now.' }],
    },
    trophies: {
      say: 'Horns, tusks and furs. The apothecary pays me for the horns and the tusks; the furs go south. Everybody wins.',
      answers: [sell('sell-horn', 'An imp horn.', 'imp-horn', 2), sell('sell-tusk', 'A brute tusk.', 'brute-tusk', 4), sell('sell-fur', 'A badger fur.', 'badger-fur', 4), { text: 'Something else.', next: 'wares' }],
    },
    candles: {
      say: 'The chandler shut his shop when the roads went bad. Now I sell what I can find, and I find nothing.',
      answers: [{ text: 'Something else.', next: 'wares' }, BYE],
    },
    sold: {
      say: 'A fair price. Fairer than most. What else?',
      answers: [{ text: 'Something else.', next: 'wares' }, { text: 'That is all.' }],
    },
    none: {
      say: 'You do not have one. I do not buy promises.',
      answers: [{ text: 'Something else.', next: 'wares' }, BYE],
    },
  },
};

/**
 * The merchant by a broken cart on the road to Ironhold (chapter 1.5.1 of Kandrax: on the way to
 * see if a trade between Ironhold and Silverspring can work). The first errand of the story
 * (quests.ts, cart): a strong character lifts the cart, any other brings a lever from the smith.
 * After the help, the merchant tells what a trader hears (more with Intelligence or Charisma).
 */
export const MERCHANT: Dialog = {
  name: 'The merchant',
  start: 'cart',
  refuse: REFUSE,
  starts: [
    { when: { quest: 'cart', at: ['met', 'lever', 'lent'] }, node: 'again' },
    { when: { quest: 'cart', at: ['done'] }, node: 'thanks' },
  ],
  nodes: {
    wanted: wanted('Stay away from my cart, robber of caravans. Pay your fine first.'),
    cart: {
      say: 'Careful, the mud is deep here. The wheel came off, and I cannot lift the cart and put the wheel on at once.',
      answers: [{ text: 'Can I help?', next: 'help', effect: CART_HELP }, { text: 'Where are you going?', next: 'where' }, BYE],
    },
    where: {
      say: 'To Ironhold, to see if this road can carry a trade. Silverspring needs tools, and Ironhold has a forge.',
      answers: [{ text: 'Can I help with the cart?', next: 'help', effect: CART_HELP }, BYE],
    },
    help: {
      say: 'Somebody must lift the cart while I put the wheel on. Or bring me a lever: the farmer of Whitegrove has one, up the road.',
      answers: [
        { text: 'Stand back. I will lift it.', next: 'lifted', gate: ATHLETICS_GATE, effect: CART_LIFT },
        { text: 'I will find a lever.' },
        { text: 'Not now.' },
      ],
    },
    again: {
      say: 'Back again? The wheel is still in the mud.',
      answers: [
        { text: 'Here is a lever.', next: 'levered', effect: CART_MEND },
        { text: 'Stand back. I will lift it.', next: 'lifted', gate: ATHLETICS_GATE, effect: CART_LIFT },
        { text: 'Where are you going?', next: 'where' },
        { text: 'Not yet.' },
      ],
    },
    lifted: {
      say: 'Hold it... there! The wheel is on. Take these coins. You saved me a day in the mud.',
      answers: [{ text: 'What news do you bring?', next: 'news' }, BYE],
    },
    levered: {
      say: 'A good lever! Now it is easy... There. The wheel is on. Take these coins. You saved me a day in the mud.',
      answers: [{ text: 'What news do you bring?', next: 'news' }, BYE],
    },
    thanks: {
      say: 'The wheel holds, thanks to you. I rest a little, then I go on to Ironhold.',
      answers: [{ text: 'What news do you bring?', next: 'news' }, BYE],
    },
    news: {
      say: 'Silverspring digs mithril, but it needs tools and blades. Ironhold has a forge, and it looks at that mithril with hungry eyes.',
      answers: [
        { text: 'The Sovereignty and the Enclave both claim these woods.', next: 'claim', gate: LORE_GATE },
        { text: 'A trader hears more than that. Tell me the rest.', next: 'rest', gate: PERSUASION_GATE },
        BYE,
      ],
    },
    claim: {
      say: 'You know your history. The Iron Sovereignty and the Mithril Enclave both want the unclaimed wildlands, and neither of them plays fair.',
      answers: [BYE],
    },
    rest: {
      say: 'Between us: the Sovereignty and the Enclave fight for these woods with dirty tricks. Be careful who pays you.',
      answers: [BYE],
    },
  },
};

/**
 * A soldier of the Iron Sovereignty in the house of the reeve (chapter 1.5.1: the soldiers will not
 * leave Ironhold, and they want Silverspring to fall). To a character who heard of the raid, it
 * says to stay out of it; with Wisdom, the character sees why.
 */
export const SOLDIER: Dialog = {
  name: 'A soldier of the Sovereignty',
  start: 'move',
  refuse: REFUSE,
  starts: [{ when: { quest: 'raid', at: ['heard', 'asked'] }, node: 'stay' }],
  nodes: {
    wanted: wanted('The robber of the caravan. Pay your fine to the reeve, or keep out of my way.'),
    move: {
      say: "Move along, traveller. The reeve's house is no place to stand about.",
      answers: [{ text: 'Who do you serve?', next: 'serve' }, { text: 'What is happening in the hills?', next: 'hills' }, BYE],
    },
    hills: {
      say: 'Nothing that the Sovereignty cannot handle. Move along.',
      answers: [BYE],
    },
    serve: {
      say: 'The Iron Sovereignty. Ironhold is ours to guard. Ironhold, and nothing else.',
      answers: [BYE],
    },
    stay: {
      say: 'I know that look. Stay out of this, traveller. The hills are no place for heroes.',
      answers: [
        { text: 'Silverspring needs help.', next: 'help' },
        { text: 'You want the hobgoblins to reach Silverspring.', next: 'threat', gate: INSIGHT_GATE },
        BYE,
      ],
    },
    help: {
      say: 'Silverspring has the Enclave. Let the Enclave help it.',
      answers: [BYE],
    },
    threat: {
      say: '...Careful. A traveller who meddles in the business of the Sovereignty can have an accident in those hills.',
      answers: [BYE],
    },
  },
};

// ---------------------------------------------------------------- Silverspring (silverspring.ts)

/**
 * Kasmut Parnika, the veteran of the Mithril Enclave who trains the militia of Silverspring
 * (chapter 1.5.1): hopeful; kind when she is calm, quick to argue under stress; loyal to the
 * Enclave, and with no love for the rich and the powerful; openly cynical of Simtu, the god of nature
 * and water, whom the priests say watches over the Silvervein. She left Great Bwini (Gran Bwini), the
 * capital of the Enclave, because she kept a secret. A character who goes to warn Silverspring (quests.ts, raid) tells her
 * of the hobgoblins.
 */
export const KASMUT: Dialog = {
  name: 'Kasmut Parnika, of the Enclave',
  start: 'hello',
  starts: [
    { when: WANTED, node: 'fine' },
    { when: { quest: 'raid', at: ['title'] }, node: 'guard' },
    { when: { quest: 'raid', at: ['home', 'lost'] }, node: 'early' },
    { when: { quest: 'raid', at: ['defended'] }, node: 'held' },
    { when: { quest: 'raid', at: ['band', 'escort'] }, node: 'himo' },
    { when: { quest: 'raid', at: ['asked', 'scouts'] }, node: 'road' },
  ],
  nodes: {
    // A character who robbed the caravan of the Enclave (story phase 5) pays its fine here.
    fine: {
      say: 'You robbed our caravan. Sixty coins for the Enclave, or get out of my town.',
      answers: [{ text: 'I will pay the fine.', next: 'paid', effect: CARAVAN_FINE }, { text: 'Not now.' }],
    },
    paid: {
      say: 'Done. Silverspring forgives you. Once.',
      answers: [BYE],
    },
    // The end of the raid (story phase 4d): the war band fell on the road, before Silverspring knew.
    early: {
      say: 'You again. The war band... dead on the road? Before it came near us?',
      answers: [{ text: 'Dead, all of it. Its camp is empty.', next: 'reward', effect: RAID_TITLE_PERMIT }, { text: 'Tell me about Silverspring.', next: 'town' }, BYE],
    },
    reward: {
      say: 'Then Silverspring owes you its life. From today you are of the guard of Silverspring. Tova keeps a bed for you at the Silver Trout. And take this permit: the jeweller sells you mithril at cost.',
      answers: [{ text: 'Thank you, Kasmut.' }],
    },
    // The band came to the town first, and fell in its streets.
    held: {
      say: 'You fought in our streets beside my militia. The town stands because of you.',
      answers: [{ text: 'It was our fight.', next: 'guarded', effect: RAID_TITLE }, BYE],
    },
    guarded: {
      say: 'From today you are of the guard of Silverspring. Tova keeps a bed for you at the Silver Trout. And speak well of our mithril, wherever you go.',
      answers: [{ text: 'I will.' }],
    },
    guard: {
      say: 'A guard of Silverspring. Ha. It suits you. The hills are quiet, for now.',
      answers: [{ text: 'Tell me about Silverspring.', next: 'town' }, { text: 'Why is a veteran of the Enclave out here?', next: 'why' }, BYE],
    },
    himo: {
      say: 'The war band is dead? Then their prisoner, the scout of Ironhold... Find him, if he lives, and take him home. Then come back to me.',
      answers: [{ text: 'I will.' }],
    },
    hello: {
      say: 'Kasmut Parnika, veteran of the Mithril Enclave. I train the militia of Silverspring. What do you want?',
      answers: [
        { text: 'Tell me about Silverspring.', next: 'town' },
        { text: 'A militia? Of whom?', next: 'militia' },
        { text: 'Why is a veteran of the Enclave out here?', next: 'why' },
        BYE,
      ],
    },
    town: {
      say: 'The Silvervein brings mithril down from the hills, a pinch at a time. The people pan it as it runs through the town, and the jeweller makes rings of it. Honest work.',
      answers: [{ text: 'Mithril? Then the town must be rich.', next: 'rich' }, { text: 'Who wants the mithril?', next: 'want' }, BYE],
    },
    rich: {
      say: 'Rich? A pinch a day feeds a family. The rich live in Great Bwini, and they never pan anything.',
      answers: [{ text: 'You do not like the rich.', next: 'dislike', gate: INSIGHT_GATE }, { text: 'Who wants the mithril?', next: 'want' }, BYE],
    },
    dislike: {
      say: 'I served them for thirty years. I know what they are. Here, at least, the people who work also eat.',
      answers: [BYE],
    },
    want: {
      say: 'Everybody. The Enclave buys it, and the Iron Sovereignty wants the Silvervein. Ironhold has iron and tools, and we have mithril. We should trade. Instead we watch each other.',
      answers: [{ text: 'A militia? Of whom?', next: 'militia' }, BYE],
    },
    militia: {
      say: 'Panners and miners with spears. Brave people, and badly trained. I do what I can. The Enclave sends advice, not soldiers.',
      answers: [{ text: 'Why is a veteran of the Enclave out here?', next: 'why' }, BYE],
    },
    why: {
      say: 'The Enclave sent me. That is all.',
      answers: [{ text: 'That is not all.', next: 'secret', gate: INSIGHT_GATE }, { text: 'The priests say that Simtu watches over the Silvervein.', next: 'gods' }, BYE],
    },
    secret: {
      say: '...No, it is not. I left Great Bwini because I kept a secret, and powerful people wanted it. I keep it still. Ask me again, and we are done.',
      answers: [BYE],
    },
    gods: {
      say: 'Simtu! The priests say many things. Simtu watches the river, and I watch the hills. Guess which of us sees the hobgoblins first.',
      answers: [BYE],
    },
    road: {
      say: 'You came up the north road? Few do now. What is it?',
      answers: [
        { text: 'Hobgoblins come through the hills to Silverspring.', next: 'hobgoblins' },
        { text: 'Tell me about Silverspring.', next: 'town' },
        BYE,
      ],
    },
    hobgoblins: {
      say: 'Hobgoblins? Who says so? Ironhold? Ironhold sends us a warning, and keeps its soldiers at home. Of course it does.',
      answers: [
        { text: 'Ironhold has no soldiers. The soldiers are of the Sovereignty.', next: 'calm' },
        { text: 'Their scouts waited in the grove on the road. I killed them.', next: 'scouts', when: { quest: 'raid', at: ['scouts'] } },
      ],
    },
    calm: {
      say: '...You are right. I am sorry. You walked that road to tell us, and nobody paid you for it. I will ready the militia. Thank you.',
      answers: [BYE],
    },
    scouts: {
      say: 'Then their war band is close behind. I will ready the militia and close the town. If you meet that band on the road... Silverspring will not forget it.',
      answers: [BYE],
    },
  },
};

/** An ale at the Silver Trout: the last barrel from Ironhold. */
const TROUT_ALE = { id: 'ale', goods: 'ale', price: 2, poor: 'poor' } as const;
/** The bed of the guard at the Silver Trout (the title of the raid): the inn becomes the character's refuge. */
const TROUT_ROOM = { id: 'room', goods: 'refuge', refuge: 'trout', price: 0, poor: 'room' } as const;

/** Tova, who keeps the Silver Trout, the inn of Silverspring. */
export const HOST: Dialog = {
  name: 'Tova, of the Silver Trout',
  start: 'welcome',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('Not you. You robbed our caravan. Pay Kasmut your fine, and then come back.'),
    welcome: {
      say: 'Welcome to the Silver Trout! Shut the door, the wind off the river is cold.',
      answers: [
        { text: 'What do you have to drink?', next: 'drink' },
        { text: 'Do you have a room?', next: 'room' },
        { text: 'Any news?', next: 'news' },
        { text: 'Not now.' },
      ],
    },
    drink: {
      say: 'Cider from the valley, and ale from Ironhold. The last barrel of it: the carts from Ironhold do not come now.',
      answers: [{ text: 'An ale, then.', next: 'ale', deal: TROUT_ALE }, { text: 'Nothing for me.' }],
    },
    ale: {
      say: 'There. Drink it slowly. When it is gone, it is gone.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'Thank you.' }],
    },
    poor: {
      say: 'An ale costs coin, friend. The river does not pay me either.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'I understand.' }],
    },
    room: {
      say: 'The rooms are for the guard of the town these days, and for its friends. Kasmut decides who is a friend.',
      answers: [{ text: 'Kasmut made me one of the guard.', next: 'guest', deal: TROUT_ROOM, when: { quest: 'raid', at: ['title'] } }, { text: 'Any news?', next: 'news' }, BYE],
    },
    guest: {
      say: 'So she did! Then the bed under the blue quilt is yours. If the hills knock you down, wake up here, not out there.',
      answers: [{ text: 'Thank you, Tova.' }],
    },
    news: {
      say: 'Kasmut drills the militia every dawn. The panners grumble, and then they go. Something in the hills worries her.',
      answers: [{ text: 'What do you have to drink?', next: 'drink' }, BYE],
    },
  },
};

/** Doran, a panner of Silverspring with a spear of the militia: he watches the west end of the main street, where the north road comes in. */
export const MILITIA: Dialog = {
  name: 'Doran, of the militia',
  start: 'halt',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('You! You robbed our caravan! Pay your fine to Kasmut.'),
    halt: {
      say: 'Halt! ...Oh. A traveller. We do not see many from the west.',
      answers: [{ text: 'What is this place?', next: 'place' }, { text: 'Who are you?', next: 'who' }, BYE],
    },
    place: {
      say: 'Silverspring. The Silvervein comes down from the hills through the town, and it carries mithril dust past every door.',
      answers: [{ text: 'Who is in charge here?', next: 'charge' }, BYE],
    },
    who: {
      say: 'Doran, of the militia. A panner, most days. Kasmut gives me a spear at dawn and takes it back at dusk.',
      answers: [{ text: 'Who is in charge here?', next: 'charge' }, BYE],
    },
    charge: {
      say: 'Kasmut Parnika, in the militia hall by the gate. A veteran of the Enclave. She shouts, but she is fair.',
      answers: [BYE],
    },
  },
};

/** A nugget of mithril, for a character with the permit of Silverspring (story phase 4d). The server checks the condition of each answer with a deal. */
const MITHRIL = { id: 'buy-mithril', goods: 'mithril', price: MITHRIL_COST, poor: 'poor' } as const;
const PERMIT = { has: 'mithril-permit' } as const;

/** Ilsa, the jeweller of Silverspring: she sells mithril at cost to a friend of the town (the permit). */
export const JEWELLER: Dialog = {
  name: 'Ilsa, the jeweller',
  start: 'shop',
  refuse: REFUSE,
  nodes: {
    wanted: wanted('Out. Robbers of caravans buy nothing here. Pay your fine to Kasmut.'),
    shop: {
      say: 'Rings of mithril, light as a breath. The Enclave buys nearly all of them.',
      answers: [{ text: 'How do you work it?', next: 'craft' }, { text: 'Will you sell me mithril?', next: 'sell' }, BYE],
    },
    craft: {
      say: 'Mithril takes a spell as wool takes a dye. I sing to it while it cools. Do not laugh.',
      answers: [{ text: 'Will you sell me mithril?', next: 'sell' }, BYE],
    },
    sell: {
      say: 'I sell only to the Enclave, or to a friend of the town. Kasmut decides who that is.',
      answers: [{ text: 'Here is the permit of Silverspring.', next: 'nugget', when: PERMIT }, BYE],
    },
    nugget: {
      say: 'The permit of Kasmut! Then you pay what the Enclave pays: five coins a nugget.',
      answers: [{ text: 'One nugget, then.', next: 'bought', deal: MITHRIL, when: PERMIT }, BYE],
    },
    bought: {
      say: 'Here. When you sell it, tell them where it comes from.',
      answers: [{ text: 'Another one.', next: 'bought', deal: MITHRIL, when: PERMIT }, { text: 'That is all.' }],
    },
    poor: {
      say: 'Five coins, friend, and room in your pack. Mithril is not given away.',
      answers: [BYE],
    },
  },
};

// ---------------------------------------------------------------- the burned homesteads (ruins.ts)

/**
 * The priest of the chapel of Ironhold. For a character who found the three burned homesteads
 * (quests.ts, ashes at `ruins`), the old books of the chapel know the phoenix; with Intelligence 13,
 * also a name in their margins.
 */
export const PRIEST: Dialog = {
  name: 'The priest',
  start: 'peace',
  starts: [
    { when: { quest: 'ashes', at: ['ruins'] }, node: 'troubled' },
    { when: { quest: 'ashes', at: ['symbol'] }, node: 'pattern' },
  ],
  nodes: {
    peace: {
      say: 'Peace to you, traveller. The candles of this chapel have burned for a hundred years.',
      answers: [{ text: 'Who keeps them lit?', next: 'candles' }, { text: 'Who built the chapel?', next: 'built' }, BYE],
    },
    built: {
      say: 'The first settlers of the valley, before Ironhold had walls. They brought the book of prayers on the lectern from far away.',
      answers: [{ text: 'Who keeps the candles lit?', next: 'candles' }, BYE],
    },
    candles: {
      say: 'I do, and the one before me did. When the night is long, come in and sit for a while. The light holds.',
      answers: [BYE],
    },
    troubled: {
      say: 'You look troubled, traveller. What did you find out there?',
      answers: [{ text: 'A phoenix, burned into three homesteads.', next: 'sign', effect: ASHES_SYMBOL }, { text: 'Nothing. Peace to you.' }],
    },
    sign: {
      say: 'A phoenix... The old books of this chapel speak of it. The sign of a god before the gods: one that burns, to be born again.',
      answers: [{ text: 'Who follows such a god?', next: 'seekers', gate: LORE_GATE }, { text: 'Thank you, Father.' }],
    },
    seekers: {
      say: 'In a margin, a later hand wrote: "those who seek in the ashes". Heretics, the book says. It does not say what they seek.',
      answers: [{ text: 'Thank you, Father.' }],
    },
    // The race to the Wren homestead (story phase 7): the priest connects the clues.
    pattern: {
      say: 'You came back. The phoenix still troubles you?',
      answers: [{ text: 'The Seekers take old things from each house before they burn it.', next: 'river', effect: ASHES_NEXT }, { text: 'Not now, Father.' }],
    },
    river: {
      say: "Old things... Old Hale's father found his black stone in the ruins by the Silvervein. One family lives by that water now: the Wrens, at its pool. Their children bring me carved stones.",
      answers: [{ text: 'What do the carvings mean?', next: 'waves', gate: LORE_GATE }, { text: 'Then the Wrens are next. I must go.' }],
    },
    waves: {
      say: 'Waves. The old books draw them so for Tigris, the goddess of the rivers, from before this chapel had a name. Go quickly, traveller.',
      answers: [{ text: 'I will.' }],
    },
  },
};

// ---------------------------------------------------------------- the Wren homestead (story phase 7)

/**
 * Mira Wren, of the homestead by the pool of the Silvervein (wren.ts). A character who warns her
 * gets the wave stone (MIRA_STONE); after the fight with the cinder hounds she thanks it, and gives
 * the stone to one who has none.
 */
export const MIRA: Dialog = {
  name: 'Mira Wren',
  start: 'hello',
  starts: [
    { when: { quest: 'ashes', at: ['next'] }, node: 'warn' },
    { when: { quest: 'ashes', at: ['stone'] }, node: 'go' },
    { when: { quest: 'ashes', at: ['held'] }, node: 'thanks' },
    { when: { quest: 'ashes', at: ['late'] }, node: 'taken' },
  ],
  nodes: {
    hello: {
      say: 'A traveller, so far from the road? Mind the pool. It is deeper than it looks.',
      answers: [{ text: 'Who lives here?', next: 'family' }, { text: 'What are the old stones round the pool?', next: 'stones' }, BYE],
    },
    family: {
      say: 'Mira Wren, and my two children. My man died two winters ago. We fish, we keep goats, and nobody bothers us.',
      answers: [{ text: 'What are the old stones round the pool?', next: 'stones' }, BYE],
    },
    stones: {
      say: 'Older than Silverspring, older than anybody knows. The children dig carved stones out of the mud there. Silverspring says that they are worth nothing.',
      answers: [BYE],
    },
    warn: {
      say: 'A traveller, so far from the road? You are out of breath. What is it?',
      answers: [{ text: 'The Ashen Seekers come for your old stones. They burn houses.', next: 'stone' }, BYE],
    },
    stone: {
      say: 'The carved stone? Then let them have it! ...No. They burn the houses that they search. Take it. Take it far away from my children.',
      answers: [{ text: 'I will take it. Hide with your children.', next: 'hide', effect: MIRA_STONE }, { text: 'Keep it hidden, then.' }],
    },
    hide: {
      say: 'The cellar. We hide in the cellar. Go!',
      answers: [{ text: 'Go.' }],
    },
    go: {
      say: 'Why are you still here? Something howls in the woods to the east!',
      answers: [{ text: 'I will deal with it.' }],
    },
    thanks: {
      say: 'The beasts are ash, and my house stands. And the woman in the mask... she looked at me. As if she knew me.',
      answers: [{ text: 'Do you still have the carved stone?', next: 'after', when: { has: 'wave-stone', not: true } }, BYE],
    },
    after: {
      say: 'Here. Take it far away from us. I never want to see it again.',
      answers: [{ text: 'Thank you.', effect: MIRA_STONE_AFTER }, { text: 'Keep it, then.' }],
    },
    taken: {
      say: 'They came like smoke: dogs of ash, and a woman in a mask of bone. I hid with the children in the cellar. They took the carved stone, only the stone, and went east on the burned trail.',
      answers: [{ text: 'I will get it back.' }],
    },
  },
};

/** The survivor of the Hale homestead: an old man who would not leave the ashes. Wisdom 13 calms him. */
export const SURVIVOR_HALE: Dialog = {
  name: 'Old Hale',
  start: 'away',
  nodes: {
    away: {
      say: 'Go away! ...Unless the reeve sent you. Did the reeve send you?',
      answers: [{ text: 'The reeve sent me. What happened here?', next: 'night' }, { text: 'You are safe now. Breathe.', next: 'calm', gate: INSIGHT_GATE }, BYE],
    },
    night: {
      say: 'They came in the night. Shadows. I hid in the well. I saw nothing, I heard nothing. Go away.',
      answers: [{ text: 'You are safe now. Breathe.', next: 'calm', gate: INSIGHT_GATE }, BYE],
    },
    calm: {
      say: '...One of the shadows sang. Low, like a priest. They took no hens and no coins. They took the box from under the hearth. My father\'s box.',
      answers: [{ text: 'What was in the box?', next: 'box' }, BYE],
    },
    box: {
      say: 'A stone, black and smooth, with marks on it. Father found it in the old ruins by the river. He said it was older than the gods.',
      answers: [{ text: 'Thank you.' }],
    },
  },
};

/** The survivor of the Tanner homestead: a girl who waits for her mother. Wisdom 13 calms her. */
export const SURVIVOR_TANNER: Dialog = {
  name: 'The Tanner girl',
  start: 'mother',
  nodes: {
    mother: {
      say: 'Are you my mother? ...No. She went to Ironhold for help. She will come back.',
      answers: [{ text: 'Who burned your house?', next: 'bird' }, { text: 'You are brave. Will you tell me what you saw?', next: 'calm', gate: INSIGHT_GATE }, BYE],
    },
    bird: {
      say: 'People in long cloaks. They had a bird of fire on them. I hid under the hides.',
      answers: [{ text: 'You are brave. Will you tell me what you saw?', next: 'calm', gate: INSIGHT_GATE }, BYE],
    },
    calm: {
      say: 'They asked Mother for "the old book". We have no book. They looked under the hearthstone anyway, and then they burned everything.',
      answers: [{ text: 'Your mother will come back. Wait here.' }],
    },
  },
};

// ---------------------------------------------------------------- the caravan of Silverspring (story phase 5)

/**
 * The driver of the caravan of Silverspring (source.ts, the convoy CARAVAN): a character tells it to
 * hand over the cargo, and its militia fight that character (it is an outlaw of the caravan).
 */
export const WAGON_DRIVER: Dialog = {
  name: 'The driver of the caravan',
  start: 'road',
  starts: [
    { when: { quest: 'caravan', at: ['robbing'] }, node: 'thief' },
    { when: { quest: 'caravan', at: ['saved'] }, node: 'thanks' },
  ],
  nodes: {
    road: {
      say: 'Keep your distance, stranger. We take goods of the Enclave to Ironhold.',
      answers: [{ text: 'What do you carry?', next: 'cargo' }, { text: 'Hand over the cargo.', next: 'rob', effect: CARAVAN_ROB }, { text: 'Safe road.' }],
    },
    cargo: {
      say: 'Furs, spices, and a small chest that is none of your business.',
      answers: [{ text: 'Hand over the cargo.', next: 'rob', effect: CARAVAN_ROB }, { text: 'Safe road.' }],
    },
    rob: {
      say: 'Never! Militia, to me!',
      answers: [{ text: 'So be it.' }],
    },
    thanks: {
      say: 'You again! Without you, we were dead on this road. Kasmut will hear your name.',
      answers: [{ text: 'Safe road.' }, { text: 'Hand over the cargo.', next: 'rob', effect: CARAVAN_ROB }],
    },
    thief: {
      say: 'Thief! Militia, to me!',
      answers: [{ text: 'So be it.' }],
    },
  },
};

// ---------------------------------------------------------------- the camp of the Seekers (story phase 8)

/**
 * Sela, tied to the post of the camp of the Seekers (seekers.ts): a Seeker who would not burn a
 * family. Freed (SELA_FREE), she tells what the Seekers want and where they strike next; Wisdom 13
 * hears her doubt, and Intelligence 13 hears where the Seekers come from (a hook for chapter 2).
 */
export const SELA: Dialog = {
  name: 'Sela',
  start: 'bound',
  nodes: {
    bound: {
      say: 'You killed them. ...Good. No, not good. Cut me loose, and I will tell you what you want to know.',
      answers: [{ text: 'Who are you?', next: 'who' }, { text: 'I will cut the ropes.', next: 'free', effect: SELA_FREE }, { text: 'Not yet.' }],
    },
    who: {
      say: 'Sela. I wore the mask for six years. Then they told me to burn a house with a family in it, and I would not. They were to judge me tonight.',
      answers: [{ text: 'I will cut the ropes.', next: 'free', effect: SELA_FREE }, { text: 'Not yet.' }],
    },
    free: {
      say: 'Thank you. Ask, and be quick: the others will come back for the camp.',
      answers: [{ text: 'What do the Seekers want?', next: 'want' }, { text: 'Who leads you?', next: 'verath' }, { text: 'Where do they strike next?', next: 'shrine' }, { text: 'Go, then.' }],
    },
    want: {
      say: 'They say that the four gods are thieves on stolen thrones, and that each old relic is one of their chains. Break the chains, and the true god wakes. I believed it once.',
      answers: [{ text: 'Do you still believe it?', next: 'doubt', gate: INSIGHT_GATE }, { text: 'Where do they strike next?', next: 'shrine' }, { text: 'Go, then.' }],
    },
    doubt: {
      say: '...Some nights. That is what frightens me. Verath does not lie, you see. Verath only tells half of the truth.',
      answers: [{ text: 'Where do they strike next?', next: 'shrine' }, { text: 'Go, then.' }],
    },
    verath: {
      say: 'Verath Shadowweave. I never saw Verath awake. Verath comes in dreams, and you wake knowing what to do. Pray that you never hear a voice in the ash.',
      answers: [{ text: 'Where do they strike next?', next: 'shrine' }, { text: 'Where do the Seekers come from?', next: 'north', gate: LORE_GATE }, { text: 'Go, then.' }],
    },
    north: {
      say: 'From a village in the far north, past the spring of the Silvervein. Our children grow up there. It is on no map.',
      answers: [{ text: 'Where do they strike next?', next: 'shrine' }, { text: 'Go, then.' }],
    },
    shrine: {
      say: 'The shrine of Tigris, under the pool of the Silvervein. The old stones of the Wrens are its keys: the wave stone opens it. Get there first, or they will.',
      answers: [{ text: 'And you?', next: 'bye' }, { text: 'Go, then.' }],
    },
    bye: {
      say: 'I have nowhere to go. North, maybe. If you ever go north... look for me.',
      answers: [{ text: 'Go safely.' }],
    },
  },
};

// ---------------------------------------------------------------- the dream of Verath (story phase 10)

/**
 * Verath Shadowweave, in a dream of ash (dream.ts: the beds of a character at `relic`): a part of the
 * truth (the four gods took thrones that were not theirs), and the choice that ends chapter 1. Verath
 * never lies, and never tells everything (Sela, phase 8): INT 13 hears what Verath leaves out, WIS 13
 * sees that Verath believes it. CHA 13 can lie to Verath.
 */
export const VERATH: Dialog = {
  name: 'Verath Shadowweave',
  start: 'ash',
  nodes: {
    ash: {
      say: 'Do not wake. Not yet. We have little time, you and I.',
      answers: [{ text: 'Who are you?', next: 'name' }, { text: 'Where am I?', next: 'where' }],
    },
    where: {
      say: 'Asleep, in a bed that you think is safe. I walk in the ash of every fire that my Seekers lit. Yours too, now.',
      answers: [{ text: 'Who are you?', next: 'name' }],
    },
    name: {
      say: 'Verath. My Seekers call me the Shadowweave. You took the Tear of Tigris from them. From me.',
      answers: [{ text: 'Your Seekers burn families.', next: 'burn' }, { text: 'Why do you want it?', next: 'why' }],
    },
    burn: {
      say: 'Some do. Fire spreads; I never said that it is clean. Ask instead why a farmer keeps a stone that is older than his gods.',
      answers: [{ text: 'Why do you want the Tear?', next: 'why' }],
    },
    why: {
      say: 'The four gods are not what your priests say. They took thrones that were not theirs. Each relic is a chain that holds the old ones down. The Tear is one link.',
      answers: [
        { text: 'Prove it.', next: 'proof' },
        { text: 'What do you leave out?', next: 'unsaid', gate: LORE_GATE },
        { text: 'You believe this.', next: 'believes', gate: INSIGHT_GATE },
        { text: 'What do you want from me?', next: 'ask' },
      ],
    },
    proof: {
      say: 'Ask your priest why the oldest book of his chapel starts in the middle. Then ask yourself who tore out the first pages.',
      answers: [{ text: 'What do you want from me?', next: 'ask' }],
    },
    unsaid: {
      say: '...You listen well. I do not say what wakes when the last chain breaks. I do not know. Nobody does. That is the price of the truth.',
      answers: [{ text: 'What do you want from me?', next: 'ask' }],
    },
    believes: {
      say: 'With all that I am. Look at me, and see that I do not lie. I only do not tell you everything.',
      answers: [{ text: 'What do you want from me?', next: 'ask' }],
    },
    ask: {
      say: 'Give me the Tear, and my Seekers will not hunt you. Keep it, and they will take it. Choose. The ash grows thin.',
      answers: [
        { text: 'Take it.', next: 'gave', effect: DREAM_GIVE },
        { text: 'No. It stays with me.', next: 'refused', effect: DREAM_REFUSE },
        { text: 'I will bring it to you, in the north.', next: 'lied', effect: DREAM_LIE, gate: PERSUASION_GATE },
        { text: 'Say nothing, and wake.' },
      ],
    },
    gave: {
      say: 'Wise. It is already in my hand. Look at your own. We will meet again, when the walls fall.',
      answers: [{ text: 'Wake.' }],
    },
    refused: {
      say: 'Then we are enemies, and I am sorry for it. Sleep well, while you can.',
      answers: [{ text: 'Wake.' }],
    },
    lied: {
      say: '...The north, then. I will wait for you there. Do not make me wait long.',
      answers: [{ text: 'Wake.' }],
    },
  },
};

// ---------------------------------------------------------------- the hamlets on the road to Ironhold (hamlets.ts)

/**
 * The farmer of Whitegrove (chapter 1.5.1, [A.2]): at the market stall, impatient. He waits for the
 * merchant of the broken cart, who should buy his lentils for Bronzehold.
 */
export const FARMER: Dialog = {
  name: 'The farmer of Whitegrove',
  start: 'wait',
  starts: [
    { when: { quest: 'lentils', at: ['carry'] }, node: 'carrying' },
    { when: { quest: 'lentils', at: ['done'] }, node: 'thanks' },
  ],
  nodes: {
    wait: {
      say: 'Have you seen a merchant on the road from the south? A cart with a bad wheel. He should be here by now.',
      answers: [
        // He lends his lever to a character who met the merchant (quests.ts, FARMER_LEVER; Fede, 2026-10-13).
        { text: 'The merchant needs a lever for his cart.', next: 'lever', effect: FARMER_LEVER, when: { has: 'crowbar', not: true } },
        { text: 'His cart is stuck, down the road.', next: 'stuck', when: { quest: 'cart', not: true } },
        { text: 'Can I help you?', next: 'help' },
        BYE,
      ],
    },
    stuck: {
      say: 'Again! That man and his wheel. My lentils wait for him, and Bronzehold waits for my lentils.',
      answers: [{ text: 'Can I help you?', next: 'help' }, BYE],
    },
    lever: {
      say: 'A lever? Take mine: it lifts more than lentils. And tell that man that my lentils wait for him.',
      answers: [{ text: 'Can I help you?', next: 'help' }, BYE],
    },
    help: {
      say: 'You can. Take a sack of lentils to the sergeant at Bronzehold, up the road. He pays when it comes. I cannot leave the stall.',
      answers: [{ text: 'I will take it.', next: 'given', effect: LENTILS_TAKE }, { text: 'What is this place?', next: 'place' }, { text: 'Not now.' }],
    },
    given: {
      say: 'Mind the goblins in the woods, and keep the sack dry. Bronzehold is north, up the road.',
      answers: [BYE],
    },
    carrying: {
      say: 'The lentils? Bronzehold is up the road, north. The sergeant waits for them.',
      answers: [
        { text: 'The merchant needs a lever for his cart.', next: 'lever', effect: FARMER_LEVER, when: { has: 'crowbar', not: true } },
        { text: 'What is this place?', next: 'place' },
        BYE,
      ],
    },
    thanks: {
      say: 'Bronzehold has its lentils, and I have my peace. Thank you.',
      answers: [
        { text: 'The merchant needs a lever for his cart.', next: 'lever', effect: FARMER_LEVER, when: { has: 'crowbar', not: true } },
        { text: 'What is this place?', next: 'place' },
        BYE,
      ],
    },
    place: {
      say: 'Whitegrove: birches, lentils, and a shrine for the road. Bronzehold is the last village of the Sovereignty. Past it, only Ironhold and the wildlands.',
      answers: [BYE],
    },
  },
};

/** The sergeant of Bronzehold (chapter 1.5.1, [A.2]): the guards of Bronzal know where the Sovereignty pushes. */
export const SERGEANT: Dialog = {
  name: 'The sergeant of Bronzehold',
  start: 'halt',
  nodes: {
    halt: {
      say: 'Bronzehold, a post of the Iron Sovereignty. State your business, traveller.',
      answers: [
        // The farmer's lentils (quests.ts, LENTILS_GIVE): the sergeant pays, and tells the news of the road (chapter 1.5.1: DC 10 with the lentils).
        { text: 'I bring lentils from Whitegrove.', next: 'lentils', effect: LENTILS_GIVE },
        { text: 'I go to Ironhold.', next: 'ironhold' },
        { text: 'What do you guard here?', next: 'guard' },
        BYE,
      ],
    },
    lentils: {
      say: 'Lentils! At last. Here is your pay. You came up the road with them, so you may hear the news of the road too.',
      answers: [{ text: 'What news?', next: 'trouble' }, BYE],
    },
    ironhold: {
      say: 'Up the road, north. Keep to it: the woods are full of goblins this year.',
      answers: [{ text: 'What do you guard here?', next: 'guard' }, BYE],
    },
    guard: {
      say: 'The road, and the edge of the Sovereignty. Past Ironhold the wildlands start, and nobody rules them.',
      answers: [{ text: 'You expect trouble.', next: 'trouble', gate: INSIGHT_GATE }, BYE],
    },
    trouble: {
      say: 'The Sovereignty sends soldiers and settlers from the central cities to claim the wildlands. Lately they all go one way: towards Silverspring.',
      answers: [BYE],
    },
  },
};

/** The guard on the lane of Bronzehold: how the goblins of the woods fight. */
export const BRONZEHOLD_GUARD: Dialog = {
  name: 'A guard of Bronzehold',
  start: 'halt',
  nodes: {
    halt: {
      say: 'Halt. Where to?',
      answers: [{ text: 'To Ironhold.', next: 'north' }, BYE],
    },
    north: {
      say: 'North, then, through the woods. Goblins patrol them. Some run, some fight. The ones that run are slow: you can catch them.',
      answers: [BYE],
    },
  },
};

