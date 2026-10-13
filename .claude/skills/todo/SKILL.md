---
name: todo
description: Take the first open item of Fede's to-do list (docs/drafts/todo.md), build it or fix it, test it, mark it done, then commit, push and deploy.
disable-model-invocation: true
---

# /todo: do the first item of the to-do list

Fede's to-do list is `docs/drafts/todo.md`. This command takes the first item under "## Open" and
builds it or fixes it, from the start to the deploy. Do one item only. Do not fix the other items,
even if they are small. If you find a new problem, add it to the list as a new item and do not fix it.

## 1. Get the latest `main`

1. Run `git fetch`, and compare `main` with `origin/main`. The VPS also commits to `main`.
2. If `origin/main` has new commits, run `git pull --rebase`.
3. If the working tree has changes that are not yours, stop and ask Fede what to do with them.

## 2. Find the item

1. Read `docs/drafts/todo.md`.
2. Take the first bullet under "## Open" (a line that starts with `- **`).
3. If "## Open" has no item, tell Fede that the list is empty, and stop.
4. Tell Fede the title of the item in one line, then start.

## 3. Understand the item

- Read all the code that the item names. A name in the item can be old: if it is gone, find the
  code with a search.
- Read the parts of `CLAUDE.md` that apply to the item.
- For a quest, an encounter, a mob or an ability, read `docs/game-design.md` first.
- For a change to the story, read `docs/story/`. Change it in the same commit as the code.
- Read the feature document in `docs/features/` that the change touches.
- If the item is a bug, make the bug occur first: a test that fails, or a screenshot that shows it.
- If the item has a question for Fede ("Ask Fede: ..."), or needs a decision that the item and the
  documents do not give, ask with `AskUserQuestion` before you build that part. Do not ask about a
  choice that has a clear default.

## 4. Build the change

Obey the rules of `CLAUDE.md`. Especially:

- Engine code uses only erasable TypeScript, and the simulation stays deterministic.
- The server owns all state that a page must not change.
- Each new text that the player reads needs a Spanish form (`strings-es.ts`, or `text-es.ts` for
  the Wilds).
- A change to the protocol increases its version and updates `docs/multiplayer.md`.
- For new art, make a preview PNG and look at it with the Read tool.
- Add tests for new behaviour. For a bug, add a test that fails before the fix and passes after it.

## 5. Check the change

1. Run `LANG=en_US.UTF-8 npm run check`. With the Spanish locale of the laptop, two tests fail for
   no real cause.
2. Make sure that all tests pass. If a test fails, fix the cause. Do not delete a test or make it
   weaker.
3. For a change that the player sees (GUI, art, the world, a fight), check it in a browser: see
   "Verify a change in a browser" in `CLAUDE.md`. Look at the screenshot with the Read tool.

## 6. Update the documents

- Update `CLAUDE.md`, `docs/features/`, `docs/story/` and `docs/multiplayer.md` where the change
  makes them wrong.
- Write in Simplified Technical English.

## 7. Commit, and mark the item done

1. Commit the change. Write the message in Simplified Technical English, with the attribution line.
2. Run `git pull --rebase`.
3. In `docs/drafts/todo.md`, move the item from "## Open" to the end of "## Done":
   - Keep the bold title and the date of the item.
   - Replace its text with one or two sentences about what changed.
   - Add the date of today and the short hash of the commit of step 1, for example
     "Done 2026-10-14, commit `abc1234`."
4. Commit this change alone, with the message "Mark done in the to-do list: <title>".
5. Run `git pull --rebase` again, then `git push`.
6. If the last pull changed the hash of the commit of step 1, correct the hash in the "Done" entry,
   then commit and push again.

## 8. Deploy

Do not do this step if only documents changed.

1. Run `ssh azyr 'cd /opt/game && git pull --ff-only && scripts/deploy.sh'`.
2. Run `ssh azyr 'cd /opt/game && git status --short'`. If only
   `packages/engine-client/src/generated/atlas.png` changed, the deploy wrote the same pixels with
   other bytes: run `git checkout -- packages/engine-client/src/generated/atlas.png` there.
3. Make sure that `curl -sI https://game.azyr.io/` gives 200.
4. Make sure that `ssh azyr 'curl -s http://127.0.0.1:3008/healthz'` says that the server is healthy.
5. Make sure that the live build has the short hash of the new `HEAD` (a `-dirty` after it is
   normal: the deploy writes `atlas.png` again before the build):

   ```bash
   M=$(curl -s https://game.azyr.io/ | grep -o 'assets/main-[^"]*\.js' | head -1)
   curl -s "https://game.azyr.io/$M" | grep -o 'build   [0-9a-f]*[-a-z]*'
   ```

## 9. Report to Fede

Tell Fede, in Simplified Technical English and in few words:

- the item, and what changed;
- the result of the tests and of the browser check;
- the commits and the result of the deploy;
- the questions that are still open, if there are some;
- the title of the next item in the list.

Then stop. Do not start the next item.
