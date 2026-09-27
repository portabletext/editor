---
'@portabletext/editor': patch
---

fix: keep skipped operations and merged selections from moving undo step boundaries

One undo no longer reverts two edits at once in two cases. When two edits are sent back to back and the second one starts with a change that has no effect, such as an empty text removal, the second edit now gets its own undo step. And an edit that starts with a selection change followed by a real change, like a behavior that selects and then sets a style, no longer merges into the edit before it.

Two additional changes: text typed as a new edit right after an undo or redo now gets its own undo step, instead of merging into the step the undo or redo left on top. And an edit that consists only of a change with no effect and a selection change, sent right behind another edit, gets its own undo step for the selection, the same as a selection change alone.
