---
'@portabletext/editor': patch
---

Relax `set_node` operation constraints for void elements: allow setting `text` on non-text nodes and `children` on void elements. Previously both properties were unconditionally rejected, blocking legitimate use cases for void node property updates.
