---
'@portabletext/markdown': minor
---

feat: round-trip unknown objects through `json:object` fences and code spans

Custom objects now survive Markdown conversion in both directions. `portableTextToMarkdown` renders a block-level object as a ` ```json:object ` fence and an inline object as a `json:object`-tagged code span, and `markdownToPortableText` turns both back into the original objects, `_key` included, no schema required. Previously these objects came back as `code` blocks, and inline objects also split the block around them, so converting to Markdown and back destroyed them.

````md
```json:object
{"_type": "product", "_key": "k1", "sku": "abc-123"}
```

AAPL is at json:object`{"_type": "stockTicker", "_key": "k2", "symbol": "AAPL"}` right now.
````

Both forms parse back to the objects in the payloads, with the surrounding text intact.

What changes in existing output and parsing:

- Markdown output changes for unknown objects: ` ```json ` fences become ` ```json:object `, and inline objects stay inside their line instead of breaking out.
- The `json:object` language is reserved. A `code` block with exactly that language keeps its code but loses the language when serialized.
- A ` ```json:object ` fence or tagged code span that doesn't contain a JSON object with a `_type` parses as ordinary code.
