---
'@portabletext/plugin-markdown-shortcuts': major
---

feat: align schema matcher callbacks

Schema matcher callbacks now consistently receive an object with a distinct `context` property and an optional `props` property:

**Before:**

```ts
<MarkdownShortcutsPlugin
  linkObject={(context, props) => {
    const schemaType = context.schema.annotations.find(
      (annotation) => annotation.name === 'link',
    )
    const hrefField = schemaType?.fields.find(
      (field) =>
        field.name === 'href' && field.type === 'string',
    )

    if (!schemaType || !hrefField) {
      return undefined
    }

    return {
      _type: schemaType.name,
      [hrefField.name]: props.href,
    }
  }}
/>
```

**After:**

```ts
<MarkdownShortcutsPlugin
  linkObject={({context, props}) => {
    const schemaType = context.schema.annotations.find(
      (annotation) => annotation.name === 'link',
    )
    const hrefField = schemaType?.fields.find(
      (field) =>
        field.name === 'href' && field.type === 'string',
    )

    if (!schemaType || !hrefField) {
      return undefined
    }

    return {
      _type: schemaType.name,
      [hrefField.name]: props.href,
    }
  }}
/>
```
