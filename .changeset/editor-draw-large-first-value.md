---
'@portabletext/editor': minor
---

feat: load the first value with `load`

A large value received through `load` is drawn in chunks after `ready`. `PortableTextEditable` becomes editable when the last chunk is drawn. Without a mounted `PortableTextEditable`, edits apply immediately after `ready`, including after the editable unmounts during drawing. Remote changes continue to apply while drawing.

```ts
editor.send({type: 'load', value})
```
