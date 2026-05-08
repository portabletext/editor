---
'@portabletext/sanity-bridge': minor
---

feat: emit Sanity-aligned `OfDefinition` shape with cycle stubs

The bridge now emits inline declarations as `{type: 'object', name: 'X', fields: [...]}` (matching `@portabletext/schema`'s grammar) and cycle stubs as bare references `{type: 'X'}`. Recursive Sanity schemas (where a type's `of` array contains itself) walk through ancestor-name cycle detection: the bridge inlines until it sees the type again, then emits a bare reference. The editor's resolver picks up the reference and terminates against its own ancestor chain. Two layers, same primitive.
