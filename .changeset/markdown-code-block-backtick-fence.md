---
'@portabletext/markdown': patch
---

fix: widen a code block's fence past a code line of backticks

A code line made only of backticks no longer closes the code block early when the Markdown is read back.
