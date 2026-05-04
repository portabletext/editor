---
'@portabletext/editor': patch
---

fix: emit well-formed patches when undoing a merge

Undoing a block merge could emit a patch with a path missing its container field segment. The patch then crashed downstream consumers that walked the path against the document tree (Studio's mutator threw `getAttribute only applies to plain objects`). The inverse-operation builder now uses canonical paths that include every field segment, so undo patches round-trip cleanly through any patch applier.
