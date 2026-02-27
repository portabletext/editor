---
'@portabletext/editor': patch
---

fix: remove internal `Transforms` namespace

Calling editor methods directly instead of going through a delegation layer. Reduces indirection and removes ~400 lines of code.
