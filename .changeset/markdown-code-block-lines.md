---
'@portabletext/markdown': major
---

feat!: parse fenced code into `lines` of text blocks

`markdownToPortableText` turns a code block into a `code` object whose content is `lines`: one text block per line of code, each holding the line's literal text in a single unmarked span. Blank lines, indentation, and a final empty line come through as they are. The default schema's `code` type declares `language` and `lines` (text blocks with no styles, decorators, annotations, lists, or inline objects) and no longer declares a string `code` field:

```ts
markdownToPortableText('```js\nfoo\n```')
// [
//   {
//     _type: 'code',
//     _key: '…',
//     language: 'js',
//     lines: [
//       {
//         _type: 'block',
//         _key: '…',
//         style: 'normal',
//         markDefs: [],
//         children: [{_type: 'span', _key: '…', text: 'foo', marks: []}],
//       },
//     ],
//   },
// ]
```

The string `code` shape is no longer supported. A schema whose `code` type has no `lines` array field of blocks (a string `code` field alone, say) gets code blocks as plain text, with a `code-block-to-text` degradation. `portableTextToMarkdown` writes a stored `{_type: 'code', code: '…'}` value as a `json:object` fence, which parses back to the same value unchanged. To keep the string shape, stay on v2 or register your own `types.code` matcher and renderer.

`DefaultCodeBlockRenderer`'s value type changes from a required `code` string to `lines`: `{_type: 'code', language: string | undefined, lines: Array<PortableTextBlock>}`. It writes each line's text raw, never through the text escaping, and ignores any other field on the value. The fence is at least three backticks and longer than any run of backticks that starts a code line, after any leading spaces or tabs, so code that contains fences round-trips. A value whose content the fence can't carry renders as a `json:object` fence instead, which parses back unchanged: a line that isn't a `normal` block holding one unmarked span and no other fields, line text with a line break or NUL, an empty `lines` array, and a `language` with a backtick, a line break, a NUL, surrounding spaces, or the value `json:object`.

A custom `types.code` matcher still receives `{language, code}`, where `code` is the fence's raw text as one string. Building `lines` from it is up to the matcher.
