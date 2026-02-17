---
'@portabletext/editor': patch
---

fix: allow clearing list on backspace before block object

In previous versions, pressing Backspace in an empty list item before a block object would incorrectly remove the entire text block and focus the block object. Now, the list properties are correctly cleared and the text block is preserved.
