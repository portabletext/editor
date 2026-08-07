---
'@portabletext/editor': patch
---

fix: selection mapping no longer dead-ends in leafless subtrees

Selecting across a table rendered with a `<colgroup>` (for example via triple-click, or clicking near the table's edges) could silently fail to update the editor's selection, leaving it stale or collapsed while the screen showed a larger selection. DOM positions that normalize into an element holding no editable content now skip to the nearest sibling with content instead, so element-level selections map to what they visually cover.
