---
'@portabletext/editor': patch
---

fix: make `diffMatchPatch` container-aware

Incoming `diffMatchPatch` patches now resolve the target span at any depth using the full path, instead of assuming a root-level block with a `children` field at depth 2.
