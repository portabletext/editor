---
'@portabletext/editor': patch
---

fix: disconnect the editable's `MutationObserver` when its element detaches

Callback refs passed to `PortableTextEditable` now run their returned cleanup when the element detaches, instead of receiving `null`.
