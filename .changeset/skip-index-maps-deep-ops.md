---
'@portabletext/editor': patch
---

fix: skip rebuilding index maps for nested operations

The editor maintains a few internal index maps to speed up repeated
queries against the value (notably an O(1) root-key lookup). They were
being rebuilt eagerly for every operation, including operations
targeting nodes deep inside containers where the root-level structure
hadn't changed. Operations against deep paths now skip the rebuild,
which removes most of the per-operation cost on container-heavy
content.
