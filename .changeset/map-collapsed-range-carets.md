---
'@portabletext/editor': patch
---

fix: map collapsed range decorations like carets

Collapsed range decorations now follow either boundary of text moved by a split or merge. A decoration at a marked-span boundary also uses the preceding span's end, matching the editor's canonical caret address.
