---
'@portabletext/editor': patch
---

fix: refresh range decorations after blocks move between their edges

Moving a text block into an existing range decoration now highlights that block's text. Moving a highlighted block out of the range continues to preserve the highlight on the text that remains between its edges.
