---
'@portabletext/editor': patch
---

fix: leave no field when redo or load empties the document

Deleting the only paragraph or block object, undoing, and redoing now leaves the host's field absent. Redoing a whole-field removal or a replacement with an empty array does the same. The editor continues to show an empty paragraph for typing.

When the editor removes every entry of the initial value because none is a valid block, its correction patches now also remove the field (`unset []`).
