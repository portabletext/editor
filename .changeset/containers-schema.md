---
'@portabletext/schema': minor
'@portabletext/sanity-bridge': minor
---

feat: add `containers` schema type

Adds `containers` to the schema for block types the user can navigate into
(tables, callouts, asides). A container is a block that holds editable content
the cursor can enter, as opposed to a block object which is void.

- `ContainerSchemaType` / `ContainerDefinition` added to `@portabletext/schema`
- `containers` on `Schema`, `SchemaDefinition`, and `compileSchema`
