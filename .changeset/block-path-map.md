---
'@portabletext/editor': minor
---

feat: add `BlockPathMap` for incremental key-to-path lookups

Adds `BlockPathMap`, a new data structure on `EditorSnapshot` that maps block keys to their Slate paths. Unlike the existing `blockIndexMap` (which rebuilds on every structural operation), `BlockPathMap` uses incremental updates — O(affected siblings) per structural operation, zero cost for text edits.

- `snapshot.blockPathMap.get(key)` — returns the full path (`number[]`)
- `snapshot.blockPathMap.getIndex(key)` — returns the block's index within its parent
- `snapshot.blockPathMap.has(key)` — existence check

The existing `blockIndexMap` on `EditorSnapshot` is preserved for backward compatibility and is now derived from `blockPathMap`.

The `BlockPathMap` type is exported from `@portabletext/editor`.
