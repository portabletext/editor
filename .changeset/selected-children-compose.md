---
'@portabletext/editor': patch
---

fix: make `getSelectedChildren` and `getSelectedSpans` container-aware

These selectors now traverse selection ranges that enter or exit editable containers, returning every child or span the selection covers regardless of depth.
