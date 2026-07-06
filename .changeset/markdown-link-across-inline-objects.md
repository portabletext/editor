---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: linkify markdown links whose text spans an inline object

Typing `[foo ⟨inline object⟩ bar](url)` now creates the link: the text spans are annotated and the inline object between them is left intact, where previously the markdown link shortcut silently did not trigger when the link text contained an inline object. An inline object inside the href region still keeps the text literal, the shortcut never deletes across an inline object and never captures an href that would silently omit one.
