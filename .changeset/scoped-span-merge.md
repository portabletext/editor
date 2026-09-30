---
'@portabletext/editor': patch
---

fix: merge only the spans a local edit touched

A local edit still merges the spans it touches with their same-mark neighbours. Typing into a span joins it with an adjacent span that has the same marks, removing a span or an inline object joins the same-mark spans on either side of it, and an inserted span joins same-mark neighbours. Empty spans are dropped under the same rule.

Same-mark pairs and empty spans that the edit did not touch are no longer merged or dropped as a side effect. A block keeps the rest of its span structure through edits elsewhere in the block, through style changes, and when a span with different marks is inserted next to an existing span. Registering or unregistering a container through `NodePlugin` no longer merges same-mark spans or drops empty spans anywhere in the document either.
