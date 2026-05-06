---
'@portabletext/editor': minor
---

feat: expose `@portabletext/editor/traversal` with `getPathSubSchema`

Adds a new entry point for traversal helpers consumers can use to introspect the editor's runtime state. Initial export is `getPathSubSchema(snapshot, path)` (`@beta`), which returns the `Schema` view that applies at a given path. Inside a registered editable container, this is the sub-schema derived from the container's `of` declaration; everywhere else it is the root schema. Useful for building UI that reflects what's allowed at the current focus.
