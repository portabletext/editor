---
'@portabletext/editor': patch
---

fix(perf): remove blocks in a range back-to-front when deleting

Deleting a selection that spans many blocks (such as select-all in a large
document) no longer slows down quadratically with the number of blocks
removed. The blocks between the endpoints are now removed from the back of
the range forward, so the work scales linearly.
