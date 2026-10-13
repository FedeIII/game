---
name: addtodo
description: Add a bug or a small feature that Fede describes to the to-do list (docs/drafts/todo.md), then go back to the work of the moment.
argument-hint: <description of the bug or the feature>
disable-model-invocation: true
---

# /addtodo: add an item to the to-do list

Fede gives this item:

> $ARGUMENTS

Write it in `docs/drafts/todo.md`. Do not fix it and do not start it now. Fede often gives an item
while you work on another task: after the item is in the list, go back to that task, at the point
where you stopped.

If the description is empty, ask Fede for it, and stop.

## 1. Find where it is in the code

- Find the code that the item touches, with a few searches (file names, functions, constants,
  frame names, texts). A good place makes the later work faster.
- Keep the search short: the work of the moment waits. Do not read many files, and do not design
  the fix.
- If you do not find the place, write the item without it.

## 2. Write the item

1. Read `docs/drafts/todo.md`.
2. If an item about the same thing is already under "## Open", add the new information to that item.
   Do not write a second item.
3. Else, add a new bullet at the end of "## Open", before "## Done". If Fede says that the item must
   come first, put it at the top of "## Open": `/todo` takes the first item.
4. Write the item in the format of the other items, in Simplified Technical English:
   - `- **<a short title>** (<the date of today>)`, with ", a bug" after the date for a bug.
   - What Fede wants, or what goes wrong. Keep Fede's meaning, and translate it to English if
     necessary. Do not add requirements that Fede did not give.
   - For a bug, the cause, if the search found it.
   - "Code: ..." with the files, functions and constants that you found.
   - A question that only Fede can answer, as "Ask Fede: ...". Do not ask it now.
5. Put an empty line before the new bullet. Indent the next lines of a bullet by two spaces, and
   keep the lines shorter than about 105 characters.

## 3. Commit

Commit only `docs/drafts/todo.md`, so that the work of the moment stays out of the commit:

```bash
git commit -m "Add to the to-do list: <title>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- docs/drafts/todo.md
```

- If the working tree has no other changes, run `git pull --rebase`, then `git push`.
- If the working tree has other changes (the work of the moment), do not push now. The commit goes
  out with the next push of that work.
- If `docs/drafts/todo.md` itself has other changes of the work of the moment, do not commit. The
  item then goes out with the next commit of that work.

## 4. Go back to the work

1. Tell Fede in one line that the item is in the list, with its title.
2. If you had a task before this command, continue it now, at the point where you stopped.
3. If you had no task, stop.
