---
'@portabletext/editor': minor
---

feat: draw a large first value in chunks after `ready` and gate editing on the last chunk

A value sent with `load` is in the editor's snapshot when `ready` fires, but its blocks are drawn onto the screen in chunks after that, one chunk per task, so a large document shows its first screen almost at once instead of after the whole value is drawn. Until the last block is drawn the editor is not editable and typing, paste, select all, undo and drag and drop do nothing. Remote `patches` and `resync` still apply while it draws. No `editable` or `read only` event is emitted for this. A value passed as `initialValue` is drawn as before.
