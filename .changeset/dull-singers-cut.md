---
'@portabletext/editor': minor
---

feat: provide Markdown serialization and deserialization out of the box

The editor now uses [@portabletext/markdown](https://www.npmjs.com/package/@portabletext/markdown) to provide Markdown serialization/deserialization when performing copy and paste actions.

When copying content, the editor now serializes to the following formats simultaneously:

- `application/x-portable-text`
- `application/json`
- `text/markdown`
- `text/html`
- `text/plain`

When pasting, the editor checks formats in the following priority order, falling back to the next format if no data is provided or no blocks can be parsed:

1. `application/x-portable-text`
2. `application/json`
3. `text/markdown`
4. `text/html`
5. `text/plain`

This means copying content from an external Markdown source and pasting into the editor will now preserve formatting like headings, bold, italic, links, lists, and code blocks.
