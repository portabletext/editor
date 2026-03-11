---
'@portabletext/editor': patch
---

Fixed a crash caused by eager `JSON.stringify` evaluation in debug logging paths. The stringify now only runs when debug logging is actually enabled, preventing crashes from circular references in operation or node objects.
