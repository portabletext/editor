---
"@portabletext/editor": patch
---

fix: keep the selection on a block after dropping it inside the editor

After an internal drop, `validate-selection-machine` could overwrite the engine's just-updated model selection with a stale DOM selection when `toDOMRange` ran before React had committed the post-drop DOM. The caret would jump to the top of the editor instead of staying on the dropped block. The machine now skips overwriting the model selection in this race window.
