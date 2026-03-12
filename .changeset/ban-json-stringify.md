---
'@portabletext/editor': patch
---

Replaced all `JSON.stringify` calls with a safe alternative that catches circular reference errors instead of crashing.
