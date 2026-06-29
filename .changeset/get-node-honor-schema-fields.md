---
'@portabletext/editor': patch
---

fix: stop `getNode` at sidecar field boundaries

`getNode(snapshot, path)` walks a path through the editor value. When the path crossed into a sidecar field that isn't the node's structural child array — e.g. `[{_key: 'block1'}, 'markDefs', {_key: 'mark1'}]` digging into an annotation on a text block — the walker kept looking up keyed segments against the wrong child list. It silently returned `undefined` only because the markDef `_key` didn't happen to collide with a span `_key`; if it did, `getNode` would have returned the unrelated span.

The walker now consults the field name produced by each `getNodeChildren` and only descends into a string segment that matches. Paths that try to dig past the sidecar boundary return `undefined` explicitly (use `getAnnotation` to resolve an annotation node). Paths that end on a trailing field name on a valid node continue to return the node with that name stripped from `entry.path`.

The schema decides what's structural: a text block descends into `children`, a container descends into its configured `arrayField` — including `'markDefs'` if a consumer registers a container with that name, which the previous string-name behavior couldn't distinguish from a real annotation path.
