---
'@portabletext/markdown': patch
---

fix: use the schema text block name when importing markdown

`markdownToPortableText` now gives text blocks the name the schema declares for them. A schema with a renamed text block previously got `_type: 'block'` back:

```ts
import {markdownToPortableText} from '@portabletext/markdown'
import {compileSchema, defineSchema} from '@portabletext/schema'

const schema = compileSchema(defineSchema({block: {name: 'myBlock'}}))

markdownToPortableText('Hello', {schema})[0]?._type
// 'myBlock' (previously 'block')
```

This applies to every text block the import creates, including blocks inside table cells and list items.
