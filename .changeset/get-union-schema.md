---
'@portabletext/editor': minor
---

feat: add `getUnionSchema` to derive the schema reachable across all containers

Returns a `Schema` containing every named decorator, annotation, list, style, block object and inline object declared anywhere in the editor's schema graph - the root schema merged with the sub-schema of every registered container, deduped by name. Useful for rendering a static toolbar whose buttons stay stable across selection moves while still reflecting everything the schema allows somewhere. Pair with `getPathSubSchema` (or a path-based intersection across a range) to determine which of the union's members are applicable at the current selection.
