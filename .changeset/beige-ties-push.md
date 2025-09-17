---
'@portabletext/editor': minor
---

fix: raise `insert.child` from `insert.(span|inline object)`

`insert.span` and `insert.inline object` now raise `insert.child` internally.
