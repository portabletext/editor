---
'@portabletext/editor': patch
---

fix: select the split result only after a split's operations are applied

Undo and redo now restore the right selection after an edit that splits a span, like making part of a span bold. Undo returns to the selection from before the edit, and redo to the selection after it. Removing a decorator from part of a selection made left to right also no longer marks the selection as backward.
