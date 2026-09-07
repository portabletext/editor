---
'@portabletext/editor': patch
---

fix: keep numeric path segments for keyless nodes in resolved paths

Paths returned by `getNode`, `getChildren`, and `getAncestors` now carry the numeric sibling index for a node without a usable `_key`, instead of a fabricated `{_key: undefined}` segment that cannot distinguish keyless siblings. Repairs and edits addressing keyless nodes now always target the right node, including keyless children nested under keyless parents, and the patches they emit address the same numeric position.
