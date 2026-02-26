---
'@portabletext/editor': patch
---

fix: replace `Transforms` calls with raw operations in editor internals

Replaced all `Transforms.*` calls in PTE source code with raw `editor.apply()` operations or direct `editor.*` method calls. This is an internal refactor with no behavior change. Helper utilities (`applySelect`, `applyDeselect`, `applySetNode`, `applyInsertNodeAtPath`, `applyInsertNodeAtPoint`, `applyMove`) extracted to `internal-utils/`.
