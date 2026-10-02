---
'@portabletext/plugin-sdk-value': patch
---

fix: guard keyed `markDefs` unsets against store-referenced definitions

An outgoing keyed `markDefs` unset is dropped while the store's spans still reference the definition, the same check outgoing whole-array `markDefs` sets already get. A client whose local state has drifted from the store can no longer delete a definition another client's annotation relies on. At worst, an unused definition stays in the document until a later edit removes it.
