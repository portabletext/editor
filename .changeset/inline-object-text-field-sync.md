---
'@portabletext/editor': patch
---

fix: write a `text`-named field on an inline object during value sync

An inline object with a custom field named `text` now picks up changes to that
field when the editor receives an updated value. Previously the change was
dropped: the editor reconciled the field as if it were span text, so the new
value never reached the inline object even though the incoming value carried it.
