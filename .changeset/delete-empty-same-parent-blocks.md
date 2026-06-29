---
'@portabletext/editor': patch
---

fix: delete a range that spans only empty same-parent blocks

Selecting across several empty blocks and pressing delete (or backspace) used to leave most of them behind. With two empty blocks the deletion was a silent no-op; with three or more, one block was removed and the rest stayed put. The user's selection extent was being silently dropped before the deletion ran.

The range-unhang step that normally pulls a trailing offset-0 focus back to the end of the previous block's content treated empty blocks as a valid anchor too, which either collapsed the range onto itself or shrank it to skip the trailing blocks. It now only anchors at non-empty content, and leaves the range alone when the walked region is fully empty so the deletion runs across every selected block.
