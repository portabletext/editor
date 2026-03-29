---
'@portabletext/editor': patch
---

fix: reduce unnecessary allocations in editor hot path

Undo step management now mutates arrays in place instead of copying the entire steps and operations arrays on every operation. `transformPath` only copies the path array when a transform is actually needed. Dirty path key generation uses template literals for common short paths instead of `Array.join`. `isEqualToEmptyEditor` short-circuits on `children.length` before doing the full check. Redo history is only cleared when non-empty. `insertChildren` and `replaceChildren` use `slice` + `splice` instead of double-spread. `pathEndsBefore` inlines the prefix comparison instead of allocating two sliced arrays. The patches plugin caches `editorActor.getSnapshot()` once per operation instead of calling it nine times. `performEvent` reuses the guard snapshot for the first action set.
