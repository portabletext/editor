---
'@portabletext/editor': patch
---

fix: keep leading no-op operations from consuming undo-step boundaries

A single undo could revert more than the most recent edit: when an editing flow's first operation was one that doesn't affect history (a zero-length text change, or an operation without an inverse), the following operations merged into the previous undo step. Undo now reverts exactly one step.

Undo also restores the selection from before the step as it was when the edit began, instead of a mid-flow selection that may reference nodes the undo itself removes (which dropped the cursor entirely).
