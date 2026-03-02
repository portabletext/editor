---
'@portabletext/editor': patch
---

fix: restore void guard for `insert.text` operation

Typing while a block object is selected no longer causes a console error. The `insert.text` operation now correctly skips void and read-only elements.
