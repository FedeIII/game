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

## Done
