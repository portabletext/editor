---
'@portabletext/editor': patch
---

Apply remote patch batches atomically. Previously a batch of remote patches was
applied best-effort, one operation at a time: when a concurrent client's
operational patch addressed a span `_key` this editor had already changed,
`apply-operation` threw `node was not found` and the batch was left partially
applied, diverging the two editors. Under the operational patch channel this
surfaced as a crash under concurrent formatting. Now, if any operation in a
remote batch fails, the whole batch is rolled back to the pre-batch value and
the whole-value sync reconciles — never a crash, never a half-applied tree.
