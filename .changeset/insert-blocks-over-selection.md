---
'@portabletext/editor': patch
---

fix: insert several blocks in place of a selection that spans blocks

Pasting or inserting several blocks over a selection that spans blocks now replaces the selection. The inserted blocks stay together where the selection was. For example, pasting two paragraphs over selected text across two paragraphs keeps both pasted paragraphs at that position instead of moving the second one to the end of the document.

If the selection covers a whole paragraph, the first inserted paragraph keeps its own block `_key` and span `_key`, as clipboard paste already does. A Behavior that handles `insert.blocks` sees one event, as before. The `insert.block`, `delete` and `select` events that follow now target the point where the selection was. Behaviors that handle them see the selection already removed.
