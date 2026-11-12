---
'@portabletext/editor': patch
---

fix: a range that names a missing span no longer selects another block

A selection or `at` range that names a span no longer in its block now resolves to nothing. Before, it fell back to the start of a block, and inside a container that was the container's first block, so a `delete` or `decorator.add` with a range kept from earlier could change text in other blocks. Now `select` and the `selection` prop deselect, and `delete`, `annotation.add`, `annotation.remove` and `insert.block` with such a range change nothing. `delete` no longer throws.
