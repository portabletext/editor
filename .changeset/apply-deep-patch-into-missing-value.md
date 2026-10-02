---
'@portabletext/patches': patch
---

fix: apply a deep patch into a missing value as a no-op, as Content Lake does

`applyAll` no longer throws when a patch's path leads into `undefined` or `null`, for example a `set`, `unset`, `insert` or `diffMatchPatch` addressed to a keyed block after the whole field was unset. The value is returned unchanged and the remaining patches in the list still apply. This matches how Content Lake evaluates the same patch: a path that selects nothing is a no-op, and the transaction is still recorded. A deep patch into a string, number or boolean still throws, since Content Lake fails that request too.
