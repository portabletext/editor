---
'@portabletext/editor': patch
---

fix: remove internal dead code exports

Removed internal dead code exports with zero callers: `getBlockPath`, `getParent`, `OmitFirstArg`, `PropsCompare`, `PropsMerge`, `BaseNode`, `OriginalEditorFunctions`, and `@types/direction.d.ts`. None of these were part of the public API.
