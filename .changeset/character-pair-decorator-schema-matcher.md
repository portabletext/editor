---
'@portabletext/plugin-character-pair-decorator': major
---

feat: align schema matcher callbacks

Schema matcher callbacks now consistently receive an object with a `context` property instead of receiving the context directly.

**Before:**

```ts
<CharacterPairDecoratorPlugin
  decorator={(context) =>
    context.schema.decorators.find((decorator) => decorator.name === 'strong')?.name
  }
  pair={{char: '*', amount: 2}}
/>
```

**After:**

```ts
<CharacterPairDecoratorPlugin
  decorator={({context}) =>
    context.schema.decorators.find((decorator) => decorator.name === 'strong')?.name
  }
  pair={{char: '*', amount: 2}}
/>
```
