---
'@portabletext/editor': patch
---

fix: move the selection out of a removed node to the nearest remaining span

When a block or other node that holds the selection is removed, for example by a remote patch that deletes the block with the caret or by `delete.block`, the selection now moves to the start of the next block, or to the end of the previous block when nothing follows. Previously it could stay on the removed block, pointing at content that no longer exists. Inside a container such as a table cell, the selection stays in the same container when it can.
