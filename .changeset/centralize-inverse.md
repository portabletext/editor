---
'@portabletext/editor': patch
---

fix: centralize inverse computation in apply layer

Inverse data for `set` and `unset` operations is now computed in the apply layer right before tree mutation, instead of at each call site. Callers no longer need to read the current node state to build inverse objects.
