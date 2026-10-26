---
'@portabletext/markdown': patch
---

fix: never generate a key that a `json:object` payload carries

`markdownToPortableText` keeps the `_key` a `json:object` fence or tagged code span carries, but the keys it generated for everything else could repeat it, so a payload and a neighbouring block or span could end up with the same key. A carried key now stays as written, and generated keys never repeat it. Keys only have to be unique among siblings, but which nodes end up as siblings is only settled as the conversion runs (a table cell can lift an object to block level, and an undeclared list flattens into paragraphs), so generated keys skip the `_key` on every payload object in the document, whether the payload comes before or after the generated node. Keys nested inside a payload are unaffected. `applyMarkdownEdit` also no longer renames a payload whose key it had just given to a renamed duplicate earlier in the same array:

```ts
import {markdownToPortableText} from '@portabletext/markdown'

let index = 0
markdownToPortableText(
  'foo\n\n```json:object\n{"_type": "product", "_key": "k0"}\n```',
  {keyGenerator: () => `k${index++}`},
)
// Previously: the paragraph and the `product` object were both keyed `k0`.
// Now: the paragraph is keyed `k1` and the `product` object keeps `k0`.
```
