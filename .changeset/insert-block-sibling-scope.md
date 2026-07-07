---
'@portabletext/editor': patch
---

fix: validate `insert.block` sibling placements against the parent array's schema

`insert.block` with `placement: 'before'` or `'after'` at a point inside a container validated the block against the destination's own sub-schema view while landing it as a sibling in the parent array. When the two scopes differed, a text block addressed at a table row, for example, the block passed validation and landed as schema-invalid data inside an array that rejects it. Such inserts now no-op, the same outcome as other schema-rejected inserts.
