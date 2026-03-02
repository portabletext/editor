---
'@portabletext/editor': patch
---

fix: restore void guard for `insert.text` operation

The `insert.text` operation now checks for void and read-only elements before
applying `insert_text`. This guard was lost during the Transforms removal
(PR #2251). Without it, typing while a block object was selected would fire an
`insert_text` operation on a non-text block, causing the patches plugin to
throw "Could not find block".

Also makes `insertTextPatch` and `removeTextPatch` return empty patches instead
of throwing when the target block is not a text block.
