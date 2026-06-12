---
"@portabletext/html": patch
---

fix: swallow Google Docs' `Apple-interchange-newline` `<br>`

Pasting from Google Docs no longer produces a trailing empty paragraph. The clipboard HTML ends with `<br class="Apple-interchange-newline">`, which previously fell through to the generic `br` handling and deserialized as an extra block containing only a newline.
