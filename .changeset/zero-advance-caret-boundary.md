---
'@portabletext/editor': patch
---

fix: resolve leaf-boundary carets past zero-advance leaves

When a decoration or mark boundary isolates a run of zero-width characters (a soft hyphen, a zero-width space) into its own leaf, the caret placed after that run now paints at the start of the following text instead of collapsing onto the same position as the caret before it. Clicking or arrowing between such a character and the text after it now shows the caret where the model actually is. Selection edges and selection rects that end at such a boundary paint past it the same way.
