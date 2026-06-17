---
'@portabletext/editor': patch
---

fix(perf): rebuild the list-index map lazily on read instead of per operation

The map behind `data-list-index` on list items is now rebuilt once when the
renderer reads it, rather than recomputed after every structural operation.
Inserting or moving many blocks in one go no longer does per-block work that
grows with document size, and the rendered index values are unchanged.
