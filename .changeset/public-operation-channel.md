---
"@portabletext/editor": minor
---

feat: subscribe to low-level editor operations via `editor.on('operation', ...)`

Every change to the editor — local edits, remote patches, value sync, normalization, undo/redo — is expressed as a sequence of six low-level operations (`insert`, `insert.text`, `remove.text`, `set`, `unset`, `set.selection`). A new `@beta` event exposes that stream so derived state can be maintained incrementally in userland:

```ts
editor.on('operation', (event) => {
  if (event.operation.type !== 'set.selection') {
    rebuildMyBlockIndex(editor.getSnapshot().context.value)
  }
})
```

Operation events deliver synchronously after each operation applies, and — unlike `patch`/`mutation` events — are not held back while the editor is pristine or setting up, so value-sync and normalization operations are observable too. The new `EditorOperation` type is exported, and `EditorEmittedEvent` gains the `{type: 'operation'}` member (exhaustive switches over `event.type` gain a case). Throwing listeners no longer prevent delivery to other listeners of the same event; errors are reported via `console.error`.
