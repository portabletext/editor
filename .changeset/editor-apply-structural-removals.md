---
'@portabletext/editor': patch
---

fix: apply removals from structural corrections

The editor removes string, number, boolean, `null` and `undefined` entries from Portable Text arrays when remote patches introduce them. This includes root blocks and entries nested in container and table-cell arrays. Objects that lack a usable `_key` receive one while keeping their array position.

The same nested container and table-cell entries are removed when they arrive through `initialValue` or `update value`. Non-object span entries in a root text block are repaired when introduced by a patch, but are not covered when supplied through `initialValue` or `update value`.

Public node lookups skip non-object array entries instead of throwing. Numeric paths continue to address raw array positions, while sibling and ranged traversal results omit the non-object entries.

A non-object used as the entire `initialValue` or `update value`, and arrays used as array entries, are not covered by this fix.
