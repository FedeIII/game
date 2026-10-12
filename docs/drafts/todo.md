# To do

> **Draft** · Fede's list of things to do later (since 2026-10-13). Fede gives an item at any time,
> between developments: write it here, with where it is in the code; do not fix it at once. Work on an
> item only when Fede asks; then move it to "Done" with the date and the commit.

## Open

- **Wider speech bubbles for long lines** (2026-10-13). The text over the player and the NPCs (the
  speech bubble) wraps at a fixed width, so a long line makes a tall, narrow bubble. Let the bubble grow
  wider when the text is longer than usual. Code: `packages/engine-client/src/render/speech-bubble.ts`
  (`MAX_TEXT_WIDTH` 104 world pixels; `font.wrap()`), which the bubbles of NPC lines, conversations
  and the player share; keep it inside the screen ("Speech bubbles stay inside the screen", CLAUDE.md).
- **Name signs at Whitegrove and Bronzehold** (2026-10-13). A sign with the name of the hamlet right
  outside each one, by the road (Whitegrove: by the south end of its lane, `WHITEGROVE_SOUTH`;
  Bronzehold: `BRONZEHOLD_SOUTH`; `worlds/wilds/src/hamlets.ts`), in the style of the Iron Sovereignty.
  They are small hamlets: no title over the screen (the rule below).
- **Titles and signs for settlements: the rule** (Fede, 2026-10-13). Big or important towns and
  villages (important for the story), and ALL cities, get a title over the screen when the player
  arrives, as the name of a world on arrival (`packages/engine-client/src/render/intro.ts`, `IntroTitle`;
  now only `WorldDefinition.intro`, once per world). Small or unimportant towns and villages
  (Whitegrove, Bronzehold) get no title. Every settlement gets a sign with its name, in the style of
  its dominion (the Sovereignty, the Enclave...). Today: Ironhold and Silverspring have no title on
  arrival and no name sign; the only sign is the signpost by the hut (`fixture/signpost`,
  `packages/engine-client/art/fixtures.ts`, which points west only). To build: a title on entering a
  town (a flag on `Town` or a place list, an area like the sound areas, once per visit), and a name sign
  fixture for each dominion's style (art), with Spanish names.

## Done
