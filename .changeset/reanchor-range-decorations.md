---
'@portabletext/editor': patch
---

spike: re-anchor range decorations after structural edit transactions

Range decorations now stay attached to their text when splitting, merging, pasting, undoing, or redoing top-level blocks. Ordinary text edits continue to move decorations synchronously.
