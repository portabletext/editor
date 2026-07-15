---
'@portabletext/editor': patch
---

fix: apply remote patches addressing `marks` and `markDefs` elements as data patches

Remote patches produced by diffing tools (e.g. `@sanity/diff-patch` in
`@portabletext/plugin-sdk-value`) can address elements of sidecar
arrays: `span.marks[0]`, `span.marks[-1]`, `block.markDefs[_key==...]`.
These paths end in a keyed or numeric segment just like structural node
paths, so the engine routed them through structural child
insertion/removal. Removals threw `Cannot apply an "unset" (node
removal) operation ... because the node was not found.` and killed the
consumer's sync, while inserts silently wrote a bogus `children` array
onto the span, corrupting the document once the value was pushed back
to the datastore. In practice this broke concurrent editing whenever a
collaborator toggled a decorator or annotation.

The engine now detects that such a path does not target the owning
node's structural child array and applies the operation as a plain data
patch on the root block, matching what the datastore computed.
`diffMatchPatch` patches on strings outside span text (e.g. a swapped
decorator inside `marks`) are applied the same way instead of being
ignored.
