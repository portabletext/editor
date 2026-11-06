---
'@portabletext/markdown': patch
---

fix: keep heading styles inside callouts and structured blockquotes

`portableTextToMarkdown` now renders a heading inside a callout or a `types.blockquote` object as a heading:

```ts
portableTextToMarkdown(markdownToPortableText('> [!NOTE]\n> # Heading'))
// Previously returned: '> [!NOTE]\n> Heading'
```

Other styles inside these containers now render the way they do at the root. A `block` renderer you pass for a custom style runs there too, and a style with no renderer goes to `unknownBlockStyle`, which by default reports a `style-fallback` to `onDegradation`. Content in the `blockquote` style, list items and whitespace-only blocks still render as plain paragraphs inside these containers.
