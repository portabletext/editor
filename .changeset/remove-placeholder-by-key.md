---
'@portabletext/editor': patch
---

fix: remove the placeholder by key when a remote `insert` fills an empty editor

A collaborator's blocks that `replace` the first index of a field that is empty on your screen now all appear, and the editor removes its own empty paragraph. Before, one of their blocks was dropped and the empty paragraph stayed.
