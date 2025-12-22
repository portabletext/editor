---
'@portabletext/editor': patch
---

fix: avoid focusing editor in `insert.block` operation

This makes sure `insert.block` is only responsible for inserting the block at
the right position and handling the internal selection. Giving the browser DOM
focus to the editor is an entirely different concern.
