---
'@portabletext/editor': patch
---

fix: record a pristine block inserted into an empty field as persisted, so the next edit does not insert it again

Undoing the deletion of the only block, then typing, no longer emits a second `insert` of the restored block. Before, the editor took the restored block for its local placeholder and inserted it again on the next edit, so a host applying the emitted patches ended up with two blocks sharing the same `_key`.
