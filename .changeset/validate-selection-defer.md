---
'@portabletext/editor': patch
---

fix: defer selection validation when the DOM hasn't caught up to the model

When a behavior runs an action set that synchronously mutates structure (insert + delete a sibling, replace a block), the editor's `MutationObserver` fires while React is still mid-commit. The selection validation machine then runs against a model that's ahead of the DOM, `toDOMRange` throws, and the catch path used to deselect and re-select the top of the document, clobbering any selection the action set placed.

The validation machine now treats the throw as "DOM hasn't caught up yet" rather than "selection is invalid." It re-fires itself in a microtask, giving React time to commit. After three failed retries it stops, leaving the selection alone instead of forcing it to the top of the document.

Consumer behaviors that previously had to pre-emptively `select(null)` and `queueMicrotask(re-select)` to work around this can drop the workaround.
