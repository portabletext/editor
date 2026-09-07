---
'@portabletext/markdown': minor
---

feat: report degraded constructs during markdown parsing

`markdownToPortableText` now takes an `onDegradation` option for constructs the schema can't represent (an undeclared decorator, a table with no `table` block object, a task checkbox with no `task` list, and so on). One callback, called at most once, after the whole document has been walked, only when at least one construct degraded: a `report` object holding `degradations`, every `Degradation` in encounter order (`{type: string, message: string, line?: number, snippet?: string}`, exported as `Degradation`, with `type` a literal union that grows as new degradation sites report; `snippet` is the offending construct's text, truncated to 40 characters, present whenever there's a specific piece of source text to quote), and `message`, the same degradations grouped, snippeted, and sorted by line into one human-readable string.

```ts
const blocks = markdownToPortableText('**a**', {
  schema: compileSchema(defineSchema({})),
  onDegradation: (report) => console.log(report),
})
// blocks: a plain span reading `a`, the `strong` formatting dropped
// report: {
//   degradations: [{type: 'decorator-dropped', message: 'Removed bold formatting, kept the text: the schema has no `strong` decorator', line: 1, snippet: 'a'}],
//   message: 'Markdown could not be converted without loss:\n- line 1: Removed bold formatting, kept the text: the schema has no `strong` decorator ("a")',
// }
```

Enforce against lossy output by throwing your own error from inside the callback; the throw propagates out of `markdownToPortableText`:

```ts
markdownToPortableText('**a**\n\n**b**\n\n| x |\n| - |\n| y |', {
  schema: compileSchema(defineSchema({})),
  onDegradation: ({message}) => {
    throw new Error(message)
  },
})
// throws Error:
// Markdown could not be converted without loss:
// - Removed bold formatting, kept the text: the schema has no `strong` decorator (2×: "a", "b")
// - line 5: Table became plain text blocks, rows and columns lost: the schema has no `table` block object
```

Repeated declines of the same kind collapse into one line of `message` instead of repeating the sentence once per occurrence; `degradations` stays ungrouped, one entry per occurrence. Match on `type`: `message` is human-readable and may change between releases.

With `onDegradation` unset, conversion still degrades silently: a library shouldn't log on its own initiative. This removes the previous behavior of a handful of style-fallback paths calling `console.warn` on their own; pass a function to `onDegradation` to observe those losses instead.
