---
'@portabletext/editor': patch
---

fix: remove non-object entries at any depth

Applying patches removes non-object entries at any depth. The editor also removes them inside blocks and container fields when the editor loads. Each removal emits a positional `unset` in a correction's patches, so hosts can keep their value in sync.

Node lookups return nothing for non-object entries, and traversal skips them.
