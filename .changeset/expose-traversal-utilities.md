---
'@portabletext/editor': minor
---

feat: expose snapshot traversal utilities from `@portabletext/editor/traversal`

Expose a batch of node-traversal helpers as `@beta` for consumers writing plugins, behaviors, and selectors against an `EditorSnapshot`:

- Node identity: `getNode`, `hasNode`, `getParent`, `getFirstChild`, `getLastChild`, `getText`
- Ancestor and descendant walks: `getAncestor`, `getAncestors`, `getChildren`, `getEnclosingBlock`, `getLeaf`
- Sibling walks: `getSibling`
- Type predicates and narrowing: `isBlock`, `getBlock`, `isInline`, `isLeaf`, `getTextBlockNode`, `getSpanNode`

These are the same traversal primitives the editor uses internally. Each takes a snapshot-shaped argument, so `editor.getSnapshot()` can be passed directly.

The existing `getPathSubSchema` and `getUnionSchema` exports are unchanged.