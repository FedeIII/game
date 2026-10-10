import type { Dialog, Gate } from '@game/engine';

/**
 * The conversations of the people of Thornwick (town.ts): what each one says, and what the
 * player can answer (see the engine's dialog.ts). Every node has a way out; a test checks each
 * dialog with checkDialog().
 */

const BYE = { text: 'Goodbye.' } as const;

/** The gate of lore: Intelligence 13 (pages on things, answers in conversations). */
export const LORE_GATE: Gate = { ability: 'int', min: 13 };
/** The gate of insight: Wisdom 13 (answers that see what a person hides). */
export const INSIGHT_GATE: Gate = { ability: 'wis', min: 13 };

/** Brann, the watchman at the gate: the first person a traveller from the hut meets. */
export const WATCHMAN: Dialog = {
  name: 'Brann, the watchman',
  start: 'halt',
  nodes: {
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
      say: 'Thornwick. An inn, a forge, a chapel, and more empty houses every year.',
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
      say: 'The gate is open to anyone who is not an imp. Welcome to Thornwick.',
      answers: [{ text: 'Where should I go first?', next: 'advice' }, { text: 'Thank you.' }],
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

/** An ale at the Crooked Lantern: 2 coins, and the walk sways for a while (the engine's ALE_TICKS). */
const ALE = { id: 'ale', goods: 'ale', price: 2, poor: 'poor' } as const;

/** Marta, who keeps the Crooked Lantern. */
export const INNKEEPER: Dialog = {
  name: 'Marta, the innkeeper',
  start: 'welcome',
  nodes: {
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
      answers: [{ text: 'The ale, then. (2 coins)', next: 'ale', deal: ALE }, { text: 'What is the green one?', next: 'green' }, { text: 'Nothing for me.' }],
    },
    ale: {
      say: 'Here. Do not tell me what you think of it. Everybody tells me.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'Thank you.' }],
    },
    poor: {
      say: 'Two coins for an ale. Come back when the woods have paid you.',
      answers: [{ text: 'Any news?', next: 'news' }, { text: 'I will.' }],
    },
    green: {
      say: 'Nobody knows. It warms you, and then it remembers you. I stopped asking.',
      answers: [{ text: 'The ale, then. (2 coins)', next: 'ale', deal: ALE }, { text: 'You know what is in it.', next: 'knows', gate: INSIGHT_GATE }, BYE],
    },
    knows: {
      say: 'Ashroot, and a pinch from the green jar. Isolde told me once. I wish she had not.',
      answers: [{ text: 'The ale, then. (2 coins)', next: 'ale', deal: ALE }, BYE],
    },
    room: {
      say: 'The beds are taken. Folk from the farms sleep here now. The farms are too close to the trees.',
      answers: [{ text: 'Any news?', next: 'news' }, BYE],
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

/** Isolde, the apothecary. */
export const APOTHECARY: Dialog = {
  name: 'Isolde, the apothecary',
  start: 'careful',
  nodes: {
    careful: {
      say: 'Careful with that shelf. Half of it heals and half of it kills.',
      answers: [
        { text: 'Which half is which?', next: 'halves' },
        { text: 'Do you have something for wounds?', next: 'wounds' },
        { text: 'What do you know of the imps?', next: 'imps' },
        { text: 'I will not touch anything.' },
      ],
    },
    halves: {
      say: 'The labels say. Unless they fell off. Some of them fell off.',
      answers: [{ text: 'Do you have something for wounds?', next: 'wounds' }, BYE],
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

/** Aldous, the reeve: he runs what is left of the town. */
export const REEVE: Dialog = {
  name: 'Aldous, the reeve',
  start: 'reeve',
  nodes: {
    reeve: {
      say: 'I am the reeve of Thornwick. Of what is left of it.',
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
