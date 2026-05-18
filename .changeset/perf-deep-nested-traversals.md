---
'@portabletext/editor': patch
---

fix: speed up traversals over deeply nested content

Traversal primitives that walk a portable text tree (ancestors, descendants, sibling chains) previously allocated path arrays and re-derived parent lookups at every step, which compounded under deep nesting (lists inside callouts inside table cells, code-blocks inside callouts). The traversal layer now threads a parent-lookup map through the descent so repeated walks reuse the same lookups. Concretely: a recursive list rendered 30 deep dropped from ~5 s of layout work per keystroke to ~100 ms in the playground stress test, and ancestor-walk-heavy selectors over the same tree show the same order-of-magnitude improvement.
