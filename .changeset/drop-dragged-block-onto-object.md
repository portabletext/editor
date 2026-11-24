---
'@portabletext/editor': patch
---

fix: drop a dragged block onto another block object

Since 8.0.0, releasing a dragged block over another block object has done nothing. It now lands next to that block again.
