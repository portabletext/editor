---
'@portabletext/editor': minor
---

feat: add `status` to the editor snapshot

`editor.getSnapshot().status` is `'loading'` until the editor's first commit has finished and `'ready'` from then on. It is already `'ready'` inside a `ready` listener, it never goes back to `'loading'`, and a plugin that mounts after `ready` reads `'ready'` at once. `status` is a required field on `EditorSnapshot`, so code that builds a snapshot by hand has to set it.

```ts
const status = editor.getSnapshot().status
```
