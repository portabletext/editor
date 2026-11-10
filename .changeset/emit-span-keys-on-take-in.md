---
'@portabletext/editor': patch
---

fix: emit patches for span `_key`s the editor adds when it takes in a value

A block whose spans arrived without a `_key` (through `initialValue` or the first `update value`) got keys in the editor that were never emitted as patches, so patches for text typed into those spans had paths matching nothing in the document. The editor now sends each of those keys as a `set` patch on the span `_key` once it is editable, before any patch that depends on it.

Three changes follow from this:

- An editable editor whose first value comes from `update value` sends the repair at once.
- A read-only editor sends the repair when it becomes editable.
- Loading a value logs one `console.warn` per repaired root block, read-only included.
