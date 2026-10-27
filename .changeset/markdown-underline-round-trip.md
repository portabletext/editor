---
'@portabletext/markdown': minor
---

feat: parse `<u>` as underline in `markdownToPortableText`

`markdownToPortableText` now reads a bare `<u>…</u>` pair as the `underline` decorator, so underline written by `portableTextToMarkdown` survives the round trip. Before, the tags were dropped as inline HTML and the text lost its underline, which also meant `applyMarkdownEdit` stripped underline from every block an edit touched:

```ts
markdownToPortableText('Read the <u>safety notice</u> before use.')
// The `safety notice` span now has `marks: ['underline']`.
// Previously it had `marks: []`, with an `inline-html-dropped` degradation.
```

The default schema now includes an `underline` decorator, and `marks.underline` lets you map it to a different decorator name. When the schema has no matching decorator, the text stays and an `underline` `decorator-dropped` degradation is reported. The tags are read as underline in both `html.inline` modes. Tags with attributes (`<u class="x">`) and unpaired tags stay inline HTML, handled as before.
