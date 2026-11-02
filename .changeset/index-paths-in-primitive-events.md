---
'@portabletext/editor': patch
---

fix: treat index paths in primitive events like the equivalent keyed paths

The `set`, `unset`, `insert`, `remove.text` and positioned `insert.text` events now treat an index path that names its fields, such as `[0, 'children', 0]`, like the keyed path to the same node, so the selection moves with the edit. Negative indexes count from the end, and an index outside its array leaves the value untouched, as they do in `@portabletext/patches`. A `set` that replaces an array item with an object that has no usable `_key` gives it a generated key, and the emitted patch includes that key.
