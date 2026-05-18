---
'@portabletext/editor': minor
---

feat: rewrite the operation layer around primitives and expose them as `@alpha` behavior events

The internal operation set has been rewritten around six primitives:
`insert`, `unset`, `set`, `insert.text`, `remove.text`, and
`select`. `set_node` was replaced by `set`/`unset` (each targeting a
single property at a path); `insert_node` was renamed to `insert`;
`remove_node` was merged into `unset` (path points at the node to
remove); and three near-overlapping delete primitives (`deleteText`,
`deleteRange`, `deleteExpandedRange`) collapsed into `deleteRange`
and `deleteCollapsed` distinguished by input shape. Each primitive
maps 1:1 to a Sanity patch, so the translation layer is direct.

Five of the primitives are now exposed as `@alpha` behavior events:
`set`, `unset`, `insert`, `remove.text` are new, and `insert.text`
evolves to accept optional `at` and `offset` (existing callers raising
`{type: 'insert.text', text}` keep working). Plugins composing
structural moves can raise `[unset, insert]` directly instead of
working around the synthetic shape.

The `operation.delete` body collapses from a 380-line bespoke
implementation into pure dispatch. Bundle size drops by ~2 KB gzipped.
