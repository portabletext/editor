---
"@portabletext/html": minor
---

feat: deserialize `<pre>` into a `code` block object when the schema defines one

When the schema defines a `code` block object with a `code` string field (like the one in the default schema), `<pre>` elements now deserialize into `{_type: 'code', code: '...'}` instead of a plain text block. Schemas without such a block object keep getting a text block, now with the `code` decorator applied when the schema defines one (previously the decorator check looked for a `code` *style*, so the decorator was never applied for typical schemas).
