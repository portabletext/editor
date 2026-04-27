---
'@portabletext/editor': patch
---

fix: make core behaviors container-aware

Block-object behaviors (Backspace, Delete, Enter, click-above/below) now
work for void block objects nested inside editable containers, not just
at the editor root. ArrowUp at the start of a container's first block
and ArrowDown at the end of its last block now navigate to the nearest
sibling at the container level instead of letting the browser drop the
caret outside the editor (a long-standing `<table>`-element gotcha).
New blocks inserted via Enter inside a container inherit the
container's sub-schema default style.
