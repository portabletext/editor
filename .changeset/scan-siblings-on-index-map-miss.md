---
'@portabletext/editor': patch
---

fix: scan siblings when `blockIndexMap` has no entry in `getNodes` and insert key checks

Range walks over a snapshot whose `blockIndexMap` has no entry for the nodes being compared no longer treat different siblings as the same position, so they no longer return nodes that lie outside the range. Inserting blocks whose `_key` already exists in the document now gives them fresh keys even when the snapshot's `blockIndexMap` has no entry for that key, instead of keeping the duplicate.
