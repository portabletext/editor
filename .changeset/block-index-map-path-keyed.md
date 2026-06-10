---
'@portabletext/editor': minor
---

feat: extend `blockIndexMap` to every keyed node

`blockIndexMap` now indexes every keyed node in the tree (root
blocks, spans, inline objects, and nodes nested inside registered
containers). Entries are keyed by the serialized full path from the
document root.

Sibling-navigation selectors (`getPreviousBlock`, `getNextBlock`,
`getNextSpan`, `getPreviousSpan`, `getNextInlineObject`,
`getPreviousInlineObject`) and behavior `getSibling` calls resolve
in constant time at any depth.
