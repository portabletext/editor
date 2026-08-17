---
'@portabletext/editor': minor
---

feat: split text blocks when a block is dropped inside them

Dropping a block object mid-paragraph now splits the paragraph at the caret, matching what paste and external drops already did. Drops at block edges, on voids, and with unresolved caret positions keep snapping before/after.
