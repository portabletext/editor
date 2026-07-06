---
'@portabletext/editor': patch
---

fix(perf): seek to the range's boundaries in range-bounded traversal

Toggling a decorator or annotation no longer slows down with the
selection's position in the document. Range-bounded node traversal
previously walked from the document's first block to the selection;
it now jumps directly to the blocks the range touches. Toggling bold
on one word at the end of an 8,000-block document drops from ~10ms to
~3ms.
