---
'@portabletext/editor': patch
---

fix: rename colliding keys before a range delete merges sibling blocks

A range delete spanning two sibling text blocks with a colliding child `_key` or `markDefs` key could reorder the merged text, replace the start block's markDef with the end block's def of the same key, and re-mint colliding keys silently, so receivers applying the resulting patches saw those children destroyed and recreated instead of moved. Colliding keys are now renamed before the merge, with `set` patches on the wire ahead of the merge's `unset`, so both markDefs survive and the merged text keeps its original order.
