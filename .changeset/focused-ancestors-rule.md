---
'@portabletext/editor': minor
---

feat: every container around the selection is focused

A container's `focused` prop in a `defineContainer` render callback is now `true` for every container ancestor that fully contains the current selection, matching the symmetry that `selected` already had. Previously only the innermost container reported `focused: true`, so an outer container chrome (table around a focused cell, code block around a focused line) had no way to react to the caret being inside it.

For a collapsed caret, every container ancestor reports focused. For an expanded selection, only containers whose subtree contains both endpoints report focused: a selection across two cells reports the row and table focused but not the cells.
