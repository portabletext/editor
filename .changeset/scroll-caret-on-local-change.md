---
'@portabletext/editor': patch
---

fix: scroll the caret into view when a local edit moves content around an unchanged selection

Pressing Enter at the start of a block inserts a new empty block above it without moving the caret's own selection points. Repeating this pushed the caret's block further and further below the fold without the editor ever scrolling it back into view. The caret's block now scrolls back into view whenever a local edit, undo, or redo moves content around a selection that stayed put.
