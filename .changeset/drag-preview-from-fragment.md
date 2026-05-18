---
'@portabletext/editor': patch
---

fix: drive the drag preview from the dragged fragment

The drag preview is now built from the actual fragment under the cursor at `dragstart`. Dragging a single block from a row of root-level siblings renders a single-block preview - not a multi-block strip. Dragging from inside a container (a cell, a callout's text block, a code-block line) renders the inner block, not the container chrome around it.
