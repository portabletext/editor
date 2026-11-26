---
'@portabletext/steps': patch
---

fix: use `@portabletext/traversal` for path helpers

`@portabletext/steps` now depends on `@portabletext/traversal` and imports `isKeyedSegment`, `pathEquals` and `pathContains` from it instead of keeping its own copies. Behavior is unchanged.
