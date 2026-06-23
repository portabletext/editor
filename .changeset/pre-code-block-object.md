---
"@portabletext/html": minor
---

feat: deserialize `<pre>` into a code block object

`<pre>` elements now deserialize into a dedicated code block object via the new `types.code` matcher, sharing the convention used by `@portabletext/markdown`. The default matcher resolves against the schema's `code` block object when it declares a `code` string field (the shape of the default schema's code object, and of `@sanity/code-input`), emitting `{_type: 'code', code: text}`. Schemas without such an object keep getting a text block, now with the `code` decorator applied when the schema defines one (previously the decorator check looked for a `code` *style*, so the decorator was never applied for typical schemas).

Consumers with a different shape can pass their own matcher:

```ts
htmlToPortableText(html, {
  types: {
    code: ({context, value}) => ({
      _key: context.keyGenerator(),
      _type: 'codeSnippet',
      source: value.code,
    }),
  },
})
```

The matcher receives `{language: string | undefined, code: string}` and returns the Portable Text Object to emit, or `undefined` to fall through (e.g. to a `code`-decorated text block).
