---
'@portabletext/editor': patch
---

fix: remove stale custom block properties during value sync

Custom properties on blocks (like `_map`) are now correctly removed when
a value sync arrives without them. Previously, `updateBlock` only set
properties present on the incoming block, leaving stale custom properties
on the editor's tree.
