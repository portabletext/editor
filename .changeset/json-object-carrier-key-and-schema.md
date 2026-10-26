---
'@portabletext/markdown': minor
---

fix: key `json:object` payloads and report types the schema does not declare

`markdownToPortableText` (and `applyMarkdownEdit`, through its `deserialize` options) now gives a `json:object` fence or tagged code span a generated `_key` when its payload has none, like every other object it builds. A payload keeps its `_key` when it is a non-empty string, and an empty or non-string `_key` is replaced with a generated one. The payload's other fields are still kept as written, but when the schema does not declare its `_type` at that position (`blockObjects` for a fence, `inlineObjects` for a code span, and `blockObjects` for an object a table cell lifts to block position), `onDegradation` now reports it as `object-type-undeclared`:

```ts
import {compileSchema, defineSchema} from '@portabletext/schema'
import {markdownToPortableText} from '@portabletext/markdown'

markdownToPortableText(
  'Arranged by json:object`{"_type":"mention","_ref":"person-1"}`.',
  {
    schema: compileSchema(defineSchema({})),
    onDegradation: ({message}) => console.warn(message),
  },
)
// Previously: the `mention` child had no `_key` and nothing was reported.
// Now: the `mention` child gets a `_key`, and onDegradation reports
// "Kept the inline `mention` object as written: the schema has no inline `mention` object"
```

Without a `schema` the check runs against the default schema, so a zero-config round trip of a custom type now reports it. Code that switches over `Degradation['type']` gains a case.
