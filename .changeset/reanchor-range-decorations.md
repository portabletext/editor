---
'@portabletext/editor': patch
---

spike: re-anchor range decorations after structural edit transactions

Range decorations now stay attached to their text when splitting, merging, pasting, undoing, or redoing top-level blocks. This includes plain-text paste inside a decoration and replacing a selection that crosses a block break. Ordinary text edits continue to move decorations synchronously.
