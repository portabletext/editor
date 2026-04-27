---
'@portabletext/editor': patch
---

feat: escape an editable container when Enter is pressed on a trailing empty line with an empty previous sibling

When the caret is on the last block of an editable container, that
block is empty, and the previous block is also empty, pressing Enter
removes the empty trailing block, removes the empty previous block,
and inserts a fresh text block AFTER the container at the container's
parent level. Mirrors the familiar "double-Enter to escape" affordance
from rich-text editors elsewhere.
