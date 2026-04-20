---
'@portabletext/editor': major
---

fix!: widen `BlockPath`, `ChildPath`, and `AnnotationPath` to `Path`

These types are now aliases for `Path`, the general recursive path type. This cascades into every event whose `at` field accepted one of the narrow aliases (`block.set`, `block.unset`, `child.set`, `child.unset`, `delete.block`, `delete.child`, `annotation.set`, `move.block`, `move.block up`, `move.block down`, `select.block`).

Several `@public` utility functions that take a `Pick<EditorContext, ...>` context argument now require `containers`: `blockOffsetToBlockSelectionPoint`, `blockOffsetToSpanSelectionPoint`, `blockOffsetToSelectionPoint`, `blockOffsetsToSelection`, `childSelectionPointToBlockOffset`, `selectionPointToBlockOffset`, `sliceBlocks`. Consumers that pass `snapshot.context` (or spread it) are unaffected; callers that build the context object themselves need to add `containers`.
