---
'@portabletext/editor': patch
---

fix: emit item-keyed `markDefs` patches instead of whole-array sets

Changing a block's annotations previously emitted a `set` of the whole `markDefs` array. When two clients annotated the same block concurrently, the last writer's array overwrote the other's at the server while both clients' span `marks` references survived, leaving annotations without definitions. Added definitions are now emitted as a `setIfMissing` plus an item `insert`, removed definitions as keyed `unset`s, and undoing those edits emits the item-keyed counterparts. Item-keyed operations merge at the server instead of overwriting.

New definitions are prepended to `markDefs` instead of appended, so code that reads the array positionally sees new definitions first. Consumers observing `patch` or `mutation` events see the finer-grained shapes; explicit whole-array writes through `block.set` still emit a whole-array `set`.
