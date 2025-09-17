---
'@portabletext/editor': patch
---

fix: derive Snapshot `selection` on demand

In some cases, the `selection` on `snapshot.context.selection` could be
slightly out of sync. Now, the selection is derived on demand whenever a
Snapshot is requested.
