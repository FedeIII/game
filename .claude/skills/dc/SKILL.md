---
name: dc
description: Load this whenever a check of an ability score (a gate, `{ ability, dc }`) goes into the game or its DC changes - a gated answer or ware of a conversation, a lore page, a line of a scene, a lock, a barred door, a drink, a gate of the page, the grades of guarded chests. It loads the rubric to choose a DC (docs/features/abilities/checks.md) and the register of every check (npm run checks), so that the new DC fits the others.
allowed-tools: Bash(sed:*), Bash(npm run checks:*)
---

# dc: choose the DC of a check

A DC is the score that a check needs: a character passes with a score of the DC or more, with no
die (Fede, 2026-10-15). Each check has its own DC, from its context. Use the rubric and the register
below for every new check, and for every change of a DC.

## The rubric (docs/features/abilities/checks.md)

!`sed -n '/^### How to choose a DC/,/^### The code/{/^### The code/!p;}' docs/features/abilities/checks.md`

If the rubric above is empty, read `docs/features/abilities/checks.md` with the Read tool.

## The register: every check of the game now

!`npm run checks --silent`

If the register above is empty, run `npm run checks`.

## Steps

1. Find the checks in the register that are like the new one: the same ability, the same kind, the
   same place or the same reward. The new DC must fit them.
2. Choose the DC with the steps of the rubric: the anchor of the action, the reward, the same fact
   with the same DC, 10 to 17 in chapter 1, the class, never block, the clue.
3. Ask Fede (AskUserQuestion, with your choice as the first option) when the rubric does not give a
   clear answer, or when the check decides a part of the story (a quest step, an ending, a reward
   of a quest). Do not ask when the rubric gives a clear answer.
4. Write the gate inline in the content, `{ ability: 'int', dc: 12 }`; the Wilds have no shared
   gate constants. When the reason for the DC is not clear from the context, give it in a comment.
5. A line that the gate lets the player say or hear starts with its tag: `gated(gate, line)`.
6. Run `npm run checks` again: the new check must be in the register. If it is a new kind of check
   that the register does not find, extend `checksOf()` (`worlds/wilds/src/checks.ts`) and
   `worlds/wilds/test/checks.test.ts`.
7. Update the documents that name the DC: the feature document of the ability
   (`docs/features/abilities/`), `docs/story/` for a check of the story, and the table of examples in
   `docs/features/abilities/checks.md` when the check is a new reference point.
8. Tell Fede the DC that you chose and why, in one line, in the report of the work.
