---
'@portabletext/editor': patch
---

fix: guard `move.block` against destination paths that resolve to the origin

Previously, sending `move.block` with `at` and `to` resolving to the same block decomposed into an `unset` followed by an `insert` against a path that no longer resolved, throwing inside the apply layer. The operation pipeline swallowed the throw with `console.error` while leaving the partial state (the unset block was gone) committed, so the source block was eaten.

`move.block` is now decomposed at the behavior layer into an abstract behavior that raises `unset` and `insert` in one batch. The same-resolved-path case short-circuits in the behavior's guard, so no apply ever runs. The operation handler is gone.

`move.block up` and `move.block down` keep restoring the pre-move selection themselves, so consumer-visible behavior for those events is unchanged.
