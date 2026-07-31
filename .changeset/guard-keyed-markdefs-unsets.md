---
'@portabletext/plugin-sdk-value': patch
---

fix: guard outgoing keyed `markDefs` unsets against store-referenced definitions

An upcoming `@portabletext/editor` release prunes unused annotation definitions as item-keyed `unset` patches instead of whole-array sets. A client that has diverged from the store can prune a definition the store's spans still reference, which would orphan another client's annotation. Outgoing keyed `markDefs` unsets are now dropped while the store's spans reference the definition, mirroring the existing guard on decomposed whole-array sets; at worst an unused definition lingers until a later converged session prunes it. Against current editor releases the guard is inert.
