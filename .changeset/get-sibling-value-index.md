---
'@portabletext/editor': patch
---

fix: validate `getSibling`'s `blockIndexMap` index against the value

`getSibling` still uses the block index map as an O(1) fast path, but now validates the index it returns against the resolved sibling list and falls back to a value scan when the map is missing or stale, an as-yet-unkeyed node, or a snapshot that pairs the live map with a pre-apply value. Previously it trusted the map blindly and returned `undefined` (reporting no sibling where one exists) or, when the map disagreed with the value, the wrong neighbour. This matches how `getNode`, `getChildren`, and `getAncestors` already treat the map.
