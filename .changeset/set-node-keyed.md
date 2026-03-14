---
'@portabletext/editor': patch
---

fix: add `set_node_keyed` operation type for keyed path support

Introduces `set_node_keyed` as a new Slate operation type that carries keyed
paths instead of indexed paths. Migrates the four property operations
(`block.set`, `block.unset`, `child.set`, `child.unset`) to produce
`set_node_keyed` operations. This is an internal refactor with no behavior
change - the first step toward keyed paths throughout the editor internals.
