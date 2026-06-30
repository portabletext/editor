---
'@portabletext/editor': patch
---

fix: scope `editor.dom.getSelectionRect` to the editor

`editor.dom.getSelectionRect` now returns the rect of the passed snapshot's selection. Previously, when focus sat outside the editor or another Portable Text editor was mounted on the page, it could return the rect of an unrelated element.
