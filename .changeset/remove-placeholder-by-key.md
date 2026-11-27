---
'@portabletext/editor': patch
---

fix: remove the placeholder by key when a remote `insert` fills an empty editor

A collaborator's blocks inserted into a field that is empty on your screen now all appear, and the editor removes its own empty paragraph. Before, an `insert` after the last index or a `replace` on the first index could drop one of their blocks and keep the empty paragraph.
