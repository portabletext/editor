---
'@portabletext/editor': patch
---

fix: mint keys for empty-string and non-string `_key` values, not just `undefined`

A child carrying `_key: ''` or a non-string `_key` now gets a fresh key minted by normalization, the same repair a child with no `_key` at all already received. Previously such keys were kept as-is, leaving nodes the editor could not reliably address. When several keyless siblings arrive at once, each now receives its own distinct key instead of the first sibling absorbing every mint.
