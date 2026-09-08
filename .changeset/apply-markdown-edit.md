---
'@portabletext/markdown': minor
---

feat: add `applyMarkdownEdit` for key-preserving markdown edits

Edit Portable Text as markdown without losing identity: serialize a stored value, let anything edit the markdown, and convert it back with the stored `_key`s restored to everything the edit did not replace.

```ts
import {applyMarkdownEdit, portableTextToMarkdown} from '@portabletext/markdown'

const markdown = portableTextToMarkdown(storedPortableText, {schema})
// ... the markdown gets edited ...
const edited = applyMarkdownEdit(storedPortableText, editedMarkdown, {
  schema, // governs both conversion directions
  serialize: {}, // must match the options that produced the markdown
})
```

Keys follow the edit the way they would in an editor: unchanged and moved blocks keep their keys, rewriting a block in place keeps its key like typing over it, a split keeps the key on the first fragment, a merge on the first block, and a typo fix lands as a text change on the same span, annotation keys included. What markdown cannot express comes back on adopted content: custom fields and styles, decorators without syntax, empty paragraphs. When evidence runs out, a block gets a fresh key rather than a wrong one, and a `json:object` payload's own key never re-keys stored content.

The options bag is the exported `ApplyMarkdownEditOptions`: one top-level `schema` governs both conversion directions, and `deserialize`/`serialize` take the two converters' remaining options, with new keys coming from `deserialize.keyGenerator`. The README's `applyMarkdownEdit` section carries the full contract: what keeps its key, what gets restored, when keys reset, and the concurrent-edit rule.
