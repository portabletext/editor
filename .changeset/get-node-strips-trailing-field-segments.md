---
'@portabletext/editor': patch
---

fix: return a path that identifies the node from `getNode`

`getNode(snapshot, path)` follows a path through the editor value and returns the deepest node it reaches. When the input path ended on a field-name string — e.g. `[{_key: 'image1'}, 'caption']` pointing into a block object's primitive field — the walker still resolved to the block but returned the input path verbatim, including the trailing field name. The contract was lying: `entry.path` didn't identify `entry.node`, and `getNode(snapshot, entry.path)` round-tripped to a different shape than the input had implied.

The walker now strips trailing field-name segments from the returned path. `getNode` always returns a path that resolves back to the same node — `getNode(snapshot, entry.path).node === entry.node`.
