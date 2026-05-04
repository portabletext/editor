---
'@portabletext/editor': patch
---

fix: preserve cursor offset inside editable containers

Typing inside an editable container could move the cursor to the wrong offset after the keystroke applied. The selection-after-typing logic now uses the full path including container segments, so the cursor lands in the same position relative to the inserted text regardless of depth.
