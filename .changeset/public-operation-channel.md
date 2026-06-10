---
"@portabletext/editor": minor
---

feat: subscribe to low-level editor operations via `editor.on('operation', ...)`

Every change to the editor — local edits, remote patches, value sync, normalization, undo/redo — is expressed as a sequence of low-level operations. A new `@beta` event exposes that stream so derived state can be maintained incrementally in userland:

```ts
editor.on('operation', (event) => {
  if (event.operation.type !== 'set.selection') {
    rebuildMyBlockIndex(editor.getSnapshot().context.value)
  }
})
```

The `EditorOperation` type is exported and `EditorEmittedEvent` gains the `{type: 'operation'}` member (exhaustive switches over `event.type` gain a case). The union is split by what each operation acts on — `insert.node`, `insert.text`, `set.value`, `set.node`, `set.property`, `set.selection`, `unset.value`, `unset.node`, `unset.property`, `remove.text` — so consumers don't have to inspect path shape to know what changed. `set.property` and `unset.property` lift the property name out into its own field.

Operation events deliver synchronously after each operation applies, and — unlike `patch`/`mutation` events — are not held back while the editor is pristine or setting up, so value-sync and normalization operations are observable too. Throwing listeners no longer prevent delivery to other listeners of the same event; errors are reported via `console.error`.
