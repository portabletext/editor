---
'@portabletext/editor': minor
---

feat: pass `focused`, `selected`, and `path` to `defineContainer` render

The render callback registered via `defineContainer` now receives `focused`, `selected`, and `path` props alongside the existing `attributes`, `children`, and `node`. `defineLeaf` already exposes these; the new fields close the asymmetry.

`focused` is `true` when the container is the innermost container that holds the caret. `selected` is `true` when the container is in the path of any leaf in the selection range. It cascades up the ancestor chain. `path` is the container's keyed path.
