---
'@portabletext/editor': major
---

feat!: remove the built-in `text/markdown` converter

Copying no longer writes a `text/markdown` entry to the clipboard alongside `text/html` and `text/plain`, and pasting `text/markdown` data no longer auto-parses it into Portable Text blocks; the paste falls back to `text/html` or `text/plain` instead. Every editor stops bundling `markdown-it` (~123KB minified), whether or not it used Markdown paste. Copying and pasting between two Portable Text Editors is unaffected: it round-trips through `application/x-portable-text`, which stays.

To restore the old behavior, add [`@portabletext/markdown`](https://www.npmjs.com/package/@portabletext/markdown) as your own dependency and register a `deserialize.data` Behavior for `text/plain` calling `markdownToPortableText`, and a `serialize.data` Behavior for `text/markdown` calling `portableTextToMarkdown`. The [migrate-render-props guide](https://www.portabletext.org/editor/guides/migrate-render-props/#restore-the-textmarkdown-clipboard-behavior) has the snippet.
