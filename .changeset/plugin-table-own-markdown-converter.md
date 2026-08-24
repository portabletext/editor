---
'@portabletext/plugin-table': major
---

feat!: forward the table rectangle through `serialize.data` instead of serializing it directly

Copying or cutting a rectangular cell selection no longer writes a `text/markdown` entry to the clipboard, and the plugin no longer depends on `@portabletext/markdown`. It still resolves the rectangle (the cells a column, row, or block selection spans, independent of the linear fragment between the corners) and still clears it on cut, but for each mime type raised on copy it now `forward`s the `serialize.data` event with the rectangle attached as `event.blocks` instead of serializing that mime type itself. Whoever handles the mime type next, a core converter or a consumer's own `serialize.data` Behavior, serializes the rectangle instead of deriving a fragment from the raw selection.

Core's `application/x-portable-text` converter reads `event.blocks` and keeps working as before: the JSON entry is still the sliced rectangle. Core's `text/html` and `text/plain` converters don't know the table's `rows`/`cells` shape, so those two entries are now empty on a table copy. Consumers who want `text/markdown` (or any other mime type) populated for table copies register their own `serialize.data` Behavior, [the markdown restore snippet in the migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/#restore-the-textmarkdown-clipboard-behavior) now serves table rectangles for free by reading `event.blocks`.
