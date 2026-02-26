---
'@portabletext/editor': patch
---

fix: remove unused internal Editor methods

Removed internal Editor methods that were superseded by the behavior system: `addMark`, `removeMark`, `deleteBackward`, `deleteForward`, `deleteFragment`, `insertSoftBreak`, `insertNode`, and `Transforms.setPoint`. These were never part of the public API.
