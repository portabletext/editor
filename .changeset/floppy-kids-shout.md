---
'@portabletext/patches': patch
---

fix: handle `setIfMissing` patch type on existing objects

Previously, applying a `setIfMissing` patch to an existing object would throw
an error. Now it correctly returns the existing object unchanged.
