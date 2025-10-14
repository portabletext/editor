---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: preserve list level if present

When toggling an ordered or unordered list, the existing `level` of the text
block is now preserved if present.
