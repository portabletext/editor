---
'@portabletext/editor': patch
---

fix: map range decorations in document order across touched blocks

Removing the only decorated content from a block between a range decoration's
endpoints now retires the decoration. Backward decorations spanning blocks also
stop growing when text is inserted at their document-order end.
