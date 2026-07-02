---
'@portabletext/editor': patch
---

fix(perf): resolve the `unset` selection fallback's nearest spans without a document scan

Backspacing through empty blocks, and any other edit that removes the
node the selection sits in, no longer slows down with document size.
Previously each such removal scanned the document from the start to
find the nearest span; in large documents this made deleting empty
lines feel sluggish (~267ms per backspace at 8,000 blocks, now ~20ms).

One narrow behavioral fix rides along: when the removed node was
addressed by a numeric path, the fallback previously moved the
selection to the document's first span; it now moves it to the actual
nearest span.
