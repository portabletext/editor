---
"@portabletext/editor": major
---

feat!: tighten and adjust block-offset utilities

`blockOffsetToSpanSelectionPoint`, `spanSelectionPointToBlockOffset`, `blockOffsetsToSelection`, and `childSelectionPointToBlockOffset` now require `containers` on their `context` argument so they resolve through container-nested text blocks at any depth. Callers passing the editor's full snapshot context keep working unchanged (`containers` is part of `EditorContext`); explicitly narrowed `Pick<EditorContext, ...>` annotations need to add `'containers'`.

`blockOffsetToBlockSelectionPoint`, `blockOffsetToSelectionPoint`, and `selectionPointToBlockOffset` are no longer part of the public API. They had no external consumers and only existed to feed the public utilities listed above.
