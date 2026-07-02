---
'@portabletext/editor': patch
---

fix: resolve `getSibling` when `blockIndexMap` misses or disagrees with the tree

`getSibling` previously returned `undefined` for siblings the tree
plainly has when the anchor's path was absent from the block-index
map, and could return the wrong sibling when the map was stale. It now
verifies the mapped position against the tree and falls back to a
linear scan, matching `getNode` and `getChildren`. Paths addressing
the anchor by numeric index now resolve instead of returning
`undefined`.
