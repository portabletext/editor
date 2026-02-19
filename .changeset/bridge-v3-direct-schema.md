---
'@portabletext/sanity-bridge': major
---

Remove `compileSchemaDefinitionToPortableTextMemberSchemaTypes`, `portableTextMemberSchemaTypesToSchema`, and the intermediate `PortableTextMemberSchemaTypes` conversion step from `sanitySchemaToPortableTextSchema`.

`sanitySchemaToPortableTextSchema` now produces a PTE `Schema` directly from the Sanity schema without going through `PortableTextMemberSchemaTypes` as an intermediate representation.

`createPortableTextMemberSchemaTypes` and the `PortableTextMemberSchemaTypes` type are still exported for consumers that need Sanity-specific schema types.
