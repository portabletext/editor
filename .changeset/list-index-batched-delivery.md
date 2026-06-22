---
'@portabletext/plugin-list-index': patch
---

fix: coalesce list-index rebuilds via the editor's batched `editor.on`

`ListIndexProvider` now rebuilds the list-index map through the editor's batched event delivery (`editor.on('operation', ..., {batch: true})`) instead of a private microtask scheduler. List numbering and the per-path re-render behavior of `useListIndex` are unchanged. The plugin now requires a version of `@portabletext/editor` whose `editor.on` supports batched delivery.
