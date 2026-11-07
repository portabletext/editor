---
'@portabletext/repair': major
---

feat!: remove non-object array entries

A correction can now contain an `unset` patch. Code that applies corrections must handle `unset` as well as `set`. `StructuralRule` gains `'non-object'`, so an exhaustive switch over correction types needs a new case.
