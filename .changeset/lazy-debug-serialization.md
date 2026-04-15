---
'@portabletext/editor': patch
---

Guard debug logging calls to avoid eager `JSON.stringify` serialization when debug namespaces are disabled.
