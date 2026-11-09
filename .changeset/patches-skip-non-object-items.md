---
'@portabletext/patches': patch
---

fix: skip `null` items when `applyAll` looks an item up by `_key`

A patch that addresses an array item by `_key` threw when the array also held a `null` item. `applyAll` now skips items that aren't objects and applies the patch to the keyed item, as Sanity does.
