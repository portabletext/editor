---
'@portabletext/markdown': patch
---

fix: stop comparing text block names to `block` when serializing markdown

`portableTextToMarkdown` now renders text blocks with a custom `_type`, such as `myBlock`, the same way it renders `block`. Numbered list items with a custom name previously all got the `1.` marker:

```ts
import {portableTextToMarkdown} from '@portabletext/markdown'

portableTextToMarkdown([
  {
    _type: 'myBlock',
    _key: 'a',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [],
    children: [{_type: 'span', _key: 'a1', text: 'foo', marks: []}],
  },
  {
    _type: 'myBlock',
    _key: 'b',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [],
    children: [{_type: 'span', _key: 'b1', text: 'bar', marks: []}],
  },
])
// '1. foo\n2. bar' (previously '1. foo\n1. bar')
```

A list starting deeper than level 1 is no longer indented into a code block, and text blocks in the `blockquote` style inside a callout or a structured blockquote no longer get a second `> ` prefix. An empty line between hard breaks also renders as a backslash break instead of a whitespace-only line that splits the paragraph when the markdown is parsed again.
