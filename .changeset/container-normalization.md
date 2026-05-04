---
"@portabletext/editor": patch
---

feat: support container normalization

Editable container content is now normalized the same way root-level content is: missing `_type` is restored, empty fields get a placeholder block, adjacent same-mark spans merge. Containers can no longer end up in invalid states from incoming patches or partial setup.
