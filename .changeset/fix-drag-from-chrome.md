---
'@portabletext/editor': patch
---

fix: drag containers and block-objects via their decoration chrome

Dragging a container (callout, blockquote, code-block, table) or
block-object (image, hr) by a `contentEditable=false` decoration
inside its render output - such as a block handle or drag affordance -
now moves the entire block. Previously, the engine resolved the drag
to the deepest text point inside the container, dropped the inner
block at the destination, and left the container intact at the origin.
The bug surfaced as "drag callout, get the callout's first paragraph;
the callout stays put."

Three independent layers needed fixing:

- `getEventPosition` now recognizes when `dragstart.target` lives
  inside a `contentEditable=false` subtree under a `data-pt-path`
  ancestor (the decoration chrome) and resolves the position to the
  block's own path instead of letting `caretPositionFromPoint`
  recover a caret inside the block's text.
- The internal-drag move-mimic uses `getSelectedBlocks` when the
  drag origin is at the top level (path length 1) - which preserves
  containers whole - and keeps using `getFragment` for deeper
  origins (block-objects or text inside container cells), where
  unwrapping to root-acceptable shape is still correct.
- `operation.delete` with `unit:'block'` short-circuits when
  `at` is collapsed on a block's path. The old flow ran
  `resolveSelection` (which walks to the deepest first text point),
  then `unsetMatchedNodesInRange` would yield both the explicit block
  and its first descendant, and the "keep deepest" dedup picked the
  descendant. The fast path unsets the explicit node directly.
