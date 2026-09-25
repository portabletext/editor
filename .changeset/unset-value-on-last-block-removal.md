---
'@portabletext/editor': patch
---

fix: emit `unset([])` when an edit removes the last block

Deleting the only block in the editor, for example a lone block object, now emits `unset([])` after the block's own `unset`, so a host applying the patches holds no value instead of an empty array, the same as every other way of clearing the field. Removing every child of the only block, which leaves an empty block once the editor restores a span, now emits `unset([])` as well, so the next keystroke no longer inserts that block a second time.

One additional change: an edit that removes every block and then inserts new ones in the same step, like pasting over a selection of only block objects, now emits `unset([])` followed by `setIfMissing([], [])` between the removals and the inserts. The host still ends up with the pasted content.
