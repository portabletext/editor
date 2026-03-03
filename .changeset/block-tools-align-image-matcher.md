---
'@portabletext/block-tools': major
---

feat!: align image matcher API with `@portabletext/markdown`

The `image` and `inlineImage` matchers on `SchemaMatchers` have been collapsed into a single `image` matcher with an `isInline` flag. The `props` parameter has been renamed to `value`.

Before:

```ts
const matchers = {
  image: ({context, props}) => {
    return {_type: 'image', _key: context.keyGenerator(), src: props.src}
  },
  inlineImage: ({context, props}) => {
    return {_type: 'image', _key: context.keyGenerator(), src: props.src}
  },
}
```

After:

```ts
const matchers = {
  image: ({context, value, isInline}) => {
    const collection = isInline
      ? context.schema.inlineObjects
      : context.schema.blockObjects

    if (!collection.some((item) => item.name === 'image')) {
      return undefined
    }

    return {_type: 'image', _key: context.keyGenerator(), src: value.src}
  },
}
```

The `ImageSchemaMatcher` type has been renamed to `ImageMatcher`.
