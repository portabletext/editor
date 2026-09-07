---
'@portabletext/editor': patch
---

fix: schedule keyless children from a wholesale set for key-mint normalization

Blocks or children that arrive without a `_key` through a whole-array `set` patch are now repaired: normalization mints a key for every keyless child and emits the corresponding `set` patches. Previously such children were skipped when collecting normalization work, so they stayed keyless in the editor and any edit addressing them could not target the document.
