---
'@portabletext/editor': patch
---

fix: step the selection focus in the editor on `Shift+ArrowLeft` and `Shift+ArrowRight`

Every `Shift+ArrowLeft` and `Shift+ArrowRight` press now extends or shrinks the selection by one character. Previously, presses could do nothing when the selection ended in an empty block, for example every other press while shrinking a selection across empty table cells, and Firefox could extend in the wrong direction in right-to-left text. The selection now steps the same way plain arrow keys move the caret: emoji and other multi-character symbols count as one step, inline and block objects are single steps, and `Shift+ArrowLeft` moves forward in right-to-left text.

`keyboard.keydown` behaviors still run first and can take over these keys, and `select` behaviors see the resulting selection.
