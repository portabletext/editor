---
'@portabletext/editor': patch
---

fix: apply remote `inc` and `dec` patches

A collaborator's `inc` or `dec` on a number field, such as a counter on a block object, now updates the editor's value. Previously the patch was ignored, so the editor kept showing the old number, and the next local edit to that object could write the old number back. Like Sanity, an `inc` or `dec` on a field that is absent or not a number changes nothing.
