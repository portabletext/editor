---
'@portabletext/editor': patch
---

fix: return a path that identifies the node from `getNode`

`getNode(snapshot, path)` walks a path through the editor value and returns the deepest node it reaches. Two parts of the contract were lying:

- When the input path ended on a field-name string — e.g. `[{_key: 'image1'}, 'caption']` pointing into a block object's primitive field — the walker still resolved to the block but returned the input path verbatim, including the trailing field name. `entry.path` didn't identify `entry.node`.
- When the input path crossed into a sidecar field that isn't the node's structural child array — e.g. `[{_key: 'block1'}, 'markDefs', {_key: 'mark1'}]` reaching an annotation on a text block — the walker continued looking up keyed segments against the wrong child list and silently returned `undefined`.

Both cases now resolve to the deepest node reachable through the schema's structural descent. Trailing field-name segments are stripped from the returned path, and the walker stops at any string segment that doesn't match the previous node's children-field name. `getNode(snapshot, entry.path).node === entry.node` for every returned entry.

Use `getAnnotation` to resolve an annotation node from a path through `markDefs`.
