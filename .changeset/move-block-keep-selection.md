---
'@portabletext/editor': patch
---

fix: keep the selection where it was when `move.block` moves a block within its parent

Sending `move.block` for a block that holds the selection now keeps the selection exactly where it was inside the moved block when the block moves among its siblings. Previously the caret ended at the start of the moved block.
