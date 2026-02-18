---
'@portabletext/sanity-bridge': patch
---

fix: deduplicate shared block/inline object names in schema compilation

When a type name appears in both `blockObjects` and `inlineObjects` of a `SchemaDefinition`, `compileSchemaDefinitionToPortableTextMemberSchemaTypes` would pass duplicate type names to `SanitySchema.compile()`, causing a "Duplicate type name added to schema" error. This generalizes the existing temporary-name pattern (previously only handling `image` and `url`) to dynamically detect and rename any shared names before compilation, then map them back afterward.
