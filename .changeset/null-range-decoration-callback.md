---
'@portabletext/editor': patch
---

fix: do not report a supplied null range decoration as moved

A controlled range decoration whose `selection` is already `null` no longer
calls `onMoved` during rendering. This prevents consumers that mirror
`onMoved` into component state from entering a render loop.
