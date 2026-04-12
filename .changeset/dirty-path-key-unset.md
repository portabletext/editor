---
'@portabletext/editor': patch
---

fix: resolve dirty path after `_key` unset

When `_key` is unset on a node, the dirty path still references the old keyed segment which no longer resolves. The dirty path system now scans siblings for the keyless node and substitutes a numeric index.
