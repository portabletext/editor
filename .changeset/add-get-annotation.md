---
'@portabletext/editor': minor
---

feat: add `getAnnotation` to `@portabletext/editor/traversal`

`getAnnotation(snapshot, path)` resolves a path of the shape
`[..., {_key: block}, 'markDefs', {_key: annotation}, ...]` to the
annotation node on the enclosing text block. Annotations live in
`markDefs` alongside `children` rather than inside the value tree, so
they aren't reachable through `getNode`. The walker is schema-aware:
a container whose own array field happens to be named `markDefs` does
not resolve to an annotation.
