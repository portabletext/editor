---
'@portabletext/plugin-character-pair-decorator': major
---

feat!: remove the deprecated `schema` argument from the `decorator` callback

The `decorator` callback of `CharacterPairDecoratorPlugin` no longer receives a top-level `schema`. Read `context.schema` instead, which is the schema at the caret.

```tsx
// Before
<CharacterPairDecoratorPlugin
  decorator={({schema}) =>
    schema.decorators.find((decorator) => decorator.name === 'em')?.name
  }
  pair={{char: '_', amount: 1}}
/>

// After
<CharacterPairDecoratorPlugin
  decorator={({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'em')
      ?.name
  }
  pair={{char: '_', amount: 1}}
/>
```
