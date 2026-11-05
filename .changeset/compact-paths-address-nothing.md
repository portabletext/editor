---
'@portabletext/editor': patch
---

fix: treat paths without a child field name as addressing nothing

A path that leaves out the child field name between two node segments, such as `[0, 0]` or `[{_key: 'b1'}, {_key: 's1'}]` instead of `[{_key: 'b1'}, 'children', {_key: 's1'}]`, no longer reaches a node. Behavior events (`set`, `unset`, `insert`, `insert.text`, `remove.text`), incoming patches and traversal lookups with such a path now change nothing and emit no patch, at the root and inside containers. A `select` with such a path keeps the current selection.

Previously the editor guessed the missing field and edited the node it found, and the patches it emitted carried the same compact path.

The same applies to any path with two node segments side by side, such as a path into an array placed directly inside an array in a block object field. Portable Text schemas cannot declare such arrays.

`rangeIntersects` returns `false` for a compact range or target, and a range decoration with a compact anchor or focus never renders.
