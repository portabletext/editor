---
'@portabletext/editor': patch
---

fix: read arrow key text direction from the focused block inside containers

Arrow keys inside a container now follow the direction of the block holding the caret, instead of the first strong character of the outermost container's text. A selected block object inside a container now moves the same way as one at the root.
