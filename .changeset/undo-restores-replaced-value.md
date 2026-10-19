---
'@portabletext/editor': patch
---

fix: restore the replaced value when undoing a structural correction

Undoing a local edit that the editor had to correct now puts back exactly what was there before the correction. A span whose `text` wasn't a string, or a node whose `_key` was an empty string, previously had that property removed on undo. The editor then corrects the restored value again, as before, so the content you see is unchanged and only the patches emitted on undo differ.
