---
'@portabletext/editor': minor
---

Expose path-based traversal primitives from `@portabletext/editor/traversal`.

The new exports are tagged `@beta` and let consumers ask path-based questions
of an `EditorSnapshot` (or any value that satisfies `TraversalSnapshot`).
Available primitives include `getNode`, `getNodes`, `getAncestor`,
`getAncestors`, `getChildren`, `getSibling`, `findSibling`,
`getFirstChild`, `getLastChild`, `getParent`, `hasNode`, `getLeaf`,
`getText`, `getValue`, `isBlock`, `getBlock`, `isInline`, `getInline`,
`isLeaf`, `isEmptyContainer`, `getSpanNode`, `getTextBlockNode`,
`getEnclosingBlock`, `getAncestorTextBlock`, `getAncestorObjectNode`,
`getHighestObjectNode`, and `getVoidAncestor`.

Together with the existing `getPathSubSchema` and `getUnionSchema` exports,
these primitives form the schema-aware path-traversal surface for building
plugins, custom selectors, and outside-editor batch processing of Portable
Text values.

`/traversal` answers questions about a specific path. For questions about
the current selection (e.g. "what's at the focus block?"), reach for
`@portabletext/editor/selectors`.
