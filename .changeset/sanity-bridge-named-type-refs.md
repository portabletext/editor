---
'@portabletext/sanity-bridge': minor
---

feat: add `sanitySchemaDefinitionToPortableTextSchema` for raw definitions with named type references

A raw (uncompiled) array definition whose fields reference another type by name (for example a `customLink` annotation field typed `customUrl`) cannot resolve that reference on its own: the definition only carries the types nested inside it. `sanitySchemaDefinitionToPortableTextSchema` takes the sibling definitions through its `options` argument:

```ts
const schema = sanitySchemaDefinitionToPortableTextSchema(richTextDefinition, {
  types: [customUrl],
})
```

`options.types` can be your complete schema type list, including the portable text field itself: an entry sharing the definition's own name is dropped in favor of the passed definition. When a reference still cannot be resolved, the error names the fix: ``Unknown type: customUrl. Define 'customUrl' in the schema or pass it via `options.types`.``
