---
'@portabletext/plugin-table': patch
---

fix: produce `text/markdown` table copies without the editor's built-in converter

Copying or cutting a table rectangle still writes GFM Markdown to the clipboard alongside `application/x-portable-text`, `text/html`, and `text/plain`. The plugin now produces that Markdown itself, through its own `@portabletext/markdown` dependency, instead of delegating to a core converter.
