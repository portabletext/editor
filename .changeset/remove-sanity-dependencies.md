---
'@portabletext/editor': major
---

feat!: remove `@sanity/*` dependencies

BREAKING CHANGES:

- `EditorConfig` no longer accepts `schema` — use `schemaDefinition` instead
- `PortableTextMemberSchemaTypes` removed from exports (available from `@portabletext/sanity-bridge`)
- `PasteData.schemaTypes` type changed from `PortableTextMemberSchemaTypes` to `EditorSchema`
- Render prop `schemaType` fields now use PTE schema types (`BlockObjectSchemaType`, `InlineObjectSchemaType`, `AnnotationSchemaType`, `DecoratorSchemaType`, `ListSchemaType`, `StyleSchemaType`) instead of Sanity types (`ObjectSchemaType`, `BlockDecoratorDefinition`, `BlockListDefinition`, `BlockStyleDefinition`)
- Deprecated `type` prop removed from `BlockRenderProps`, `BlockChildRenderProps`, `BlockAnnotationRenderProps`, and `BlockDecoratorRenderProps`
