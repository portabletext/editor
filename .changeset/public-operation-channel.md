---
"@portabletext/editor": minor
---

feat: subscribe to low-level editor operations via `editor.on('operation', ...)`

Every change to the editor (local edits, remote patches, value sync, normalization, undo/redo) is expressed as a sequence of low-level operations. A new `@beta` event exposes the five document-changing ones (`insert`, `insert.text`, `remove.text`, `set`, `unset`) so derived state can be maintained incrementally in userland:

```ts
editor.on('operation', (event) => {
  rebuildMyBlockIndex(editor.getSnapshot().context.value)
})
```

Operation events deliver synchronously after each operation applies, and, unlike `patch`/`mutation` events, are not held back while the editor is pristine or setting up, so value-sync and normalization operations are observable too. Selection movements are not emitted on this stream; subscribe to the `selection` event instead. Operations carry the engine's optional `inverse` (present when the engine needs the operation to be reversible; an `unset`'s inverse is how a consumer learns what was removed). The new `Operation` type is exported, and `EditorEmittedEvent` gains the `{type: 'operation'}` member (exhaustive switches over `event.type` gain a case).
