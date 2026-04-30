---
"@portabletext/editor": patch
---

fix: collapse caret to focus side of deleted range

After a `delete` event on an expanded selection, the caret now lands on the focus side of the original range rather than the anchor side. The visible cursor position is unchanged in all current scenarios — both endpoints describe the same location at span boundaries — but the resulting selection path matches the user's pointing direction, which matters for downstream consumers that read `editor.selection` after a delete.
