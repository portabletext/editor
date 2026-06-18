---
'@portabletext/plugin-list-index': patch
---

fix: number list items nested in containers

`useListIndex` now returns an index for list items inside a container
(for example a table cell), numbering within their own array and
restarting at 1 in each. Previously `buildListIndexMap` walked only the
top-level blocks, so cell-nested list items rendered unnumbered.
