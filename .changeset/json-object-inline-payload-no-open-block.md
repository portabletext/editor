---
'@portabletext/markdown': patch
---

fix: keep a `json:object`-tagged code span with no open text block as an inline object

`markdownToPortableText` stored a `json:object`-tagged code span as literal text when no text block was open at that point, for example in a paragraph that follows a fenced block inside the same list item, in a list the schema flattens into paragraphs. It now opens a text block there, as it does for plain text, and keeps the payload as an inline object, with the same keying and `object-type-undeclared` reporting as anywhere else. Text before the tag stays a span. A tagged code span in that position that fails to reconstruct now reports as `object-carrier-invalid`.

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {markdownToPortableText} from '@portabletext/markdown'

const result = markdownToPortableText(
  '- foo\n\n  ```json:object\n  {"_type": "product"}\n  ```\n\n  json:object`{"_type":"stockTicker","symbol":"AAPL"}`',
  {schema: compileSchema(defineSchema({}))},
)
result.at(-1).children
// Previously: [{_type: 'span', text: 'json:object{"_type":"stockTicker","symbol":"AAPL"}', ...}]
// Now: [{_type: 'stockTicker', symbol: 'AAPL', _key: ...}]
```
