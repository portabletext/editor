---
'@portabletext/editor': patch
---

fix: remove dropped blocks by key when `update value` adds or moves no blocks

When the editor receives a new value that removes blocks without adding or reordering any, the selection in the remaining blocks now stays where it was, also when other blocks changed in the same update. For example, with the blocks "foo", "bar", "baz" and "qux" and the caret in "baz", syncing a value without "bar" keeps the caret in "baz". Previously the caret jumped to the start of the document, and a selection spanning several blocks could end up pointing at a block that no longer exists. Removing the last block while it holds the caret now also moves the caret to the start of the document instead of leaving it on the removed block.
