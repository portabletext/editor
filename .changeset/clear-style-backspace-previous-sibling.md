---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: only clear style on Backspace when nothing above the block can be removed

Backspace at the start of a heading below an empty line now removes the empty line and keeps the heading's style. If the heading is also a list item, the first press clears the list instead, per the editor's existing list behavior, and the empty line above only goes on a second press. Below an image or other block object, it follows the editor's own object-removal handling instead. Below a block with content, and at the top of the document, it still clears the style as before.
