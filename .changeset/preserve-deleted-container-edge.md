---
'@portabletext/editor': patch
---

fix: preserve range decorations when their container edge is deleted

Deleting a table or another editable container that holds one edge of a range decoration now shrinks the decoration to its surviving text. The decoration is removed only when the edit deletes all of its highlighted text.
