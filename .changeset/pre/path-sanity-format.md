---
'@portabletext/editor': patch
---

fix: write and read editor paths in Sanity's path format

A nested field named `true`, `false` or `null` is now written in its quoted form, as `@sanity/util/paths` writes it. A block inside a container field named `null` now has `data-pt-path` `[_key=="k0"]["null"][_key=="k1"]` instead of `[_key=="k0"].null[_key=="k1"]`, and its `blockIndexMap` key changes the same way. Selectors and code that read those keys need the new form. Every other `data-pt-path` value and `blockIndexMap` key is unchanged.
