---
'@portabletext/editor': patch
---

fix: keep range decorations attached through split, merge and paste

Range decorations now follow their text through Enter, Backspace and Delete merges, paste, cross-block replacement, undo, and redo.

A prop decoration whose text is fully deleted, even when its block remains, is removed and receives `onMoved({newSelection: null})` instead of remaining as a collapsed range. Prop decorations receive one `onMoved` call per edit with the final range, and deaths are reported at the end of the edit. Registered decorations receive one `onMapped` call per edit with net mappings and no longer receive a transient `null` for a decoration that survives. A controlled prop decoration with `selection: null` no longer calls `onMoved` on every update.
