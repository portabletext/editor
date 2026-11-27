---
'@portabletext/editor': patch
---

fix: replace the anchor item on a remote `insert` with position `replace`

A remote `insert` patch with position `replace` now removes the item it addresses and puts the inserted items in its place, at the root, inside a container and among a block's spans, and for paths that address the item by key, by index or by a negative index. Previously the editor inserted the items before the addressed item and kept it, so the editor's value ended up with an extra block or span that the document no longer had.
