---
'@portabletext/editor': major
---

feat!: remove `splitTextBlock`

The `splitTextBlock` utility constructed selection points from a block alone, hardcoding two-segment paths (`[{_key: block._key}, 'children', {_key: child._key}]`). Inside containers like callouts or table cells, those points didn't address the right nodes, so the function was unsafe to use anywhere except the document root. There were no internal callers and no clean way to fix the signature without taking a full path, so the utility is removed. Consumers who need to split a block into a before/after pair can compose `sliceBlocks` (or call `sliceTextBlock` internally) at the path they actually have.
