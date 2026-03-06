---
'@portabletext/editor': minor
---

Add `BlockPathMap` for incremental block indexing with depth-aware key-path lookups. This replaces the internal flat `blockIndexMap` rebuild with O(1) lookups and O(affected siblings) incremental updates on structural operations. Text edits have zero cost. The public `blockIndexMap` on `EditorSnapshot` is preserved for backward compatibility, derived from the new `blockPathMap`.
