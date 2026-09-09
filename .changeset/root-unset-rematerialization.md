---
'@portabletext/editor': patch
---

fix: re-materialize the field before patches emitted while it is unset

A behavior replacing the whole value in one action set (a root `unset` followed by an `insert`) previously emitted a patch stream that patch-applying stores could not apply: an `insert` into a field the preceding `unset` had removed. Consumers saw `Cannot apply deep operations on primitive values`.

One additional change: clearing the editor through a behavior-raised root `unset` now re-materializes the field on the next edit under a value-mirroring host, the same way clearing it with the keyboard already did.
