---
'@portabletext/editor': patch
---

fix(perf): notify render selectors only when their inputs can have changed

Typing and moving the caret in large documents no longer pay a cost
proportional to the block count. Previously every editor change
re-ran an internal selector for every rendered block and span; in a
document with thousands of blocks this made each keystroke and caret
move noticeably sluggish. Rendered output is unchanged.
