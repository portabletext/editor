---
'@portabletext/schema': minor
'@portabletext/sanity-bridge': minor
---

feat: add nested blocks schema support

Add `nestedBlocks` to `Schema` and `SchemaDefinition` for block types that
appear inside block objects (e.g. table cells containing Portable Text content).

- `NestedBlockSchemaType` / `NestedBlockDefinition` for nested block types
- `OfDefinition` discriminated union (`BlockOfDefinition` | `ObjectOfDefinition`)
  on `FieldDefinition.of` for array field member types
- `compileSchema()` emits `nestedBlocks: []` for existing schemas (additive)
- `sanitySchemaToPortableTextSchema()` walks block object fields recursively to
  detect objects containing array-of-blocks fields
