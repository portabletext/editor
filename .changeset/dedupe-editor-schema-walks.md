---
'@portabletext/editor': patch
---

fix: visit shared schema objects once when discovering inline fields

Starting an editor with a schema that shares nested objects no longer walks the same object repeatedly while finding inline fields and text block fields.
