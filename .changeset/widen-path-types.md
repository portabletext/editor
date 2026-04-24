---
'@portabletext/editor': major
---

fix!: widen `BlockPath`, `ChildPath`, and `AnnotationPath` to `Path`

These three types are now aliases for `Path`, the general recursive path type, so blocks, children, and annotations can live inside editable containers at any depth. The widening cascades into every event whose `at` field accepted one of the narrow aliases (`block.set`, `block.unset`, `child.set`, `child.unset`, `delete.block`, `delete.child`, `annotation.set`, `move.block`, `move.block up`, `move.block down`, `select.block`). Consumers that destructured positional segments (e.g. `path[0]._key`) must use `path.at(-1)` for a `BlockPath` (the block key sits at the end) or `path.at(-3)` for an `AnnotationPath`, each with a `KeyedSegment` guard, or reach for traversal utilities.
