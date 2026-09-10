---
'@portabletext/markdown': minor
---

feat: add `applyMarkdownEdit` for key-preserving markdown edits

Edit Portable Text as markdown without losing identity. Serialize a stored value, let anything edit the markdown, and convert it back with the stored `_key`s restored to everything the edit did not replace:

```ts
import {applyMarkdownEdit, portableTextToMarkdown} from '@portabletext/markdown'

const markdown = portableTextToMarkdown(storedPortableText, {schema})
// ... the markdown gets edited ...
const edited = applyMarkdownEdit(storedPortableText, editedMarkdown, {
  schema, // governs both conversion directions
  serialize: {}, // must match the options that produced the markdown
})
```

The options bag is the exported `ApplyMarkdownEditOptions` type: a single `schema` option governs both conversion directions, and `deserialize`/`serialize` take the same remaining option shapes as `markdownToPortableText` and `portableTextToMarkdown` respectively.

Keys follow the edit the way they would in an editor: unchanged and moved blocks keep their keys (repeated content pairs in order), rewriting a block in place keeps its key like typing over it (style changes and edited table cells included), splitting keeps the key on the first non-empty fragment, merging keeps the first block's key (soft-wrap joins included), and a typo fix lands as a text change on the same span, annotation keys included. An adopted block also gets back any field the markdown dialect can't carry, like `alignment` on a text block, since the edit never had a chance to touch it; a field markdown does express follows the edit. When an insertion or deletion makes positions ambiguous, only clear similarity evidence adopts a key and everything else gets a new one. `json:object` payloads keep the keys they carry, unless reconciliation matches the payload to stored content, which takes the stored key even over a differing key in the payload; output keys are always unique among siblings. The function never mutates its inputs and returns the reconciled value.
