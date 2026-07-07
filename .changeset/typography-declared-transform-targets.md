---
'@portabletext/plugin-typography': patch
---

fix: declare the replacement targets of the fraction and multiplication transforms

The `1/2`, `1/4`, `3/4`, and multiplication (`2x3` → `2×3`) transforms now capture their replacement targets in named groups and declare them as `transform` record keys, following `@portabletext/plugin-input-rule`'s contract that replacement targets are declared rather than inferred. Behavior is unchanged; this release pairs with the input-rule major that removes positional group access and the implicit group-replacement mode.
