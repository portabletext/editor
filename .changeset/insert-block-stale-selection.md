---
'@portabletext/editor': patch
---

fix: keep `insert.block` inside an editable container when the prior delete left it without text

A behavior chain that deletes a container's content and then inserts a fresh block (slash-command paths, paste-replace, format-toggle on a fresh selection) used to drop the new block at the document root instead of inside the container, because the container's editable field had become empty between the two events. `insert.block` now detects "endBlock is a registered editable container with an empty editable field" and inserts the block as the container's first child.
