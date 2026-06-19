---
'@portabletext/toolbar': patch
---

fix(perf): recompute toolbar button state once per microtask, not per editor event

Toolbar buttons no longer freeze the editor while recomputing their active
state during large edits. Deleting or changing a big selection previously
recomputed every button's active state on every underlying operation, each
recompute scanning the whole selection; the state now settles once per change.
