---
'@portabletext/editor': patch
---

fix: never apply a text operation with empty text

The editor no longer applies `insert.text` or `remove.text` operations with empty text, so `operation` listeners no longer receive operations that change nothing. This also fixes a case where one undo reverted two edits.

One additional change: a `remove.text` event with empty text no longer normalizes the block it targets.
