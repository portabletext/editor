---
'@portabletext/markdown': minor
---

feat: add first-class GFM callout support

GFM callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.) are now parsed as structured callout objects instead of regular blockquotes. A `DefaultCalloutRenderer` is also available for serializing callout objects back to GFM syntax. Consumers can customize callout handling via the `types.callout` matcher option.

```ts
import {markdownToPortableText} from '@portabletext/markdown'

markdownToPortableText('> [!NOTE]\n> This is a note')
// => [{_type: 'callout', tone: 'note', content: [...]}]
```

```ts
import {DefaultCalloutRenderer, portableTextToMarkdown} from '@portabletext/markdown'

portableTextToMarkdown(blocks, {
  types: {callout: DefaultCalloutRenderer},
})
// => '> [!NOTE]\n> This is a note'
```
