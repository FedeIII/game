#!/usr/bin/env python3
"""
A PostToolUse hook (.claude/settings.json): when an edit writes the DC of an ability check into the
code of the game ("dc: 12" in a .ts file that is not a test), it tells Claude to load the skill `dc`,
which holds the rubric to choose a DC (docs/features/abilities/checks.md) and the register of the checks.
It prints nothing for any other edit.
"""
import json
import re
import sys

DC = re.compile(r"\bdc\s*:\s*\d+")

try:
    event = json.load(sys.stdin)
except ValueError:
    sys.exit(0)

tool = event.get("tool_input") or {}
path = tool.get("file_path") or ""
if not path.endswith(".ts") or path.endswith(".test.ts") or "/test/" in path:
    sys.exit(0)

# The new text of the edit: Write gives `content`, Edit `new_string`, MultiEdit a list of `edits`.
texts = [tool.get("content") or "", tool.get("new_string") or ""]
texts += [e.get("new_string") or "" for e in tool.get("edits") or []]
if not any(DC.search(t) for t in texts):
    sys.exit(0)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": (
            f"This edit of {path} writes the DC of an ability check. If the skill `dc` is not loaded in this "
            "task, load it now (Skill tool, skill \"dc\"): it gives the rubric to choose a DC "
            "(docs/features/abilities/checks.md) and the register of the checks (npm run checks). Check this "
            "DC against the rubric and against the checks like it, and give its reason in a comment when the "
            "context does not show it."
        ),
    }
}))
