---
"@portabletext/editor": minor
---

feat: use keyed paths internally

The editor now identifies nodes by their `_key` rather than their position in the tree. Paths emitted in patches, paths exposed through `getSnapshot`, and paths consumers receive in behavior events all use keyed segments (`{_key: 'k0'}`) instead of numeric indices. Paths stay stable across concurrent edits, which is a prerequisite for nested editable containers (callouts, tables, code-blocks) and aligns the editor's internal model with the Sanity patch protocol's keyed addressing.
