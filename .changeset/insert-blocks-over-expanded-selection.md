---
'@portabletext/editor': patch
---

fix: delete an expanded selection before `insert.block` and `insert.blocks` with `placement: 'auto'`

Sending `insert.block` or `insert.blocks` with `placement: 'auto'` and no `at` while text is selected now replaces the selection the same way a paste does. Selecting the "a" in "bar" and inserting an image block gives "b", the image, then "r", where it used to leave "br" with the image after it. Inserting several blocks over a selection that spans more than one block, for example from an `onPaste` handler that resolves `{insert: blocks}`, no longer moves the later blocks to the end of the document, and a selection made backwards no longer leaves selected text behind. Undo reverts the insert, and the deletion with it, in one step.
