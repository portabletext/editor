---
'@portabletext/plugin-markdown-shortcuts': major
---

feat!: remove the deprecated `schema` and `level` arguments from the config callbacks

The callbacks of `MarkdownShortcutsPlugin` (`blockquoteStyle`, `defaultStyle`, `headingStyle`, `unorderedList`, `orderedList`, `boldDecorator`, `codeDecorator`, `italicDecorator` and `strikeThroughDecorator`) no longer receive a top-level `schema`. Read `context.schema` instead, which is the schema at the caret. `headingStyle` no longer receives a top-level `level` either, so read `props.level`.

```tsx
// Before
<MarkdownShortcutsPlugin
  headingStyle={({schema, level}) =>
    schema.styles.find((style) => style.name === `h${level}`)?.name
  }
/>

// After
<MarkdownShortcutsPlugin
  headingStyle={({context, props}) =>
    context.schema.styles.find((style) => style.name === `h${props.level}`)
      ?.name
  }
/>
```
