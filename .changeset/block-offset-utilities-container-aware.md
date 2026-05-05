---
"@portabletext/editor": major
---

feat!: tighten and adjust block-offset utilities

`blockOffsetToSpanSelectionPoint`, `spanSelectionPointToBlockOffset`, `blockOffsetsToSelection`, and `childSelectionPointToBlockOffset` now take a `snapshot` argument and resolve through container-nested text blocks at any depth. Pass the editor snapshot directly instead of a `context` object.

`blockOffsetToBlockSelectionPoint`, `blockOffsetToSelectionPoint`, and `selectionPointToBlockOffset` are no longer part of the public API. They had no external consumers and only existed to feed the public utilities listed above.
