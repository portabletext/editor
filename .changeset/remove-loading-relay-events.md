---
'@portabletext/editor': major
---

feat!: remove the `loading`, `done loading`, and `error` editor events

The deprecated `loading`, `done loading`, and `error` members are removed from `EditorEmittedEvent`. The `error` event was never emitted; `loading` and `done loading` fired only around an async `onPaste` resolution and no longer do. Exhaustive switches over `event.type` lose three cases; listeners for these events can be deleted.
