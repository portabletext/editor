---
'@portabletext/schema': major
---

feat: compile cyclic schema definition graphs

`compileSchema` now preserves shared and cyclic object definitions instead of repeatedly expanding them. Hand-written tree definitions retain their previous compiled shape.
