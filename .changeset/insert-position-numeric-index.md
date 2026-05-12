---
"@portabletext/editor": patch
---

fix: align `insert` operation with the patches spec for numeric-index paths

When an `insert` patch's path ended in a numeric index, the apply layer treated the index as the absolute destination and ignored `position`. So `{type: 'insert', path: [2], position: 'after', items: [X]}` landed at index 2 instead of index 3, diverging from `@portabletext/patches` and the Sanity content-lake spec.

This is reachable from the public `patches` event - a remote insert with `position: 'after'` on a numeric-index path now lands at the correct index.
