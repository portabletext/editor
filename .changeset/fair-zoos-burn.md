---
'@portabletext/editor': patch
---

fix: make outgoing `set` patches depth-agnostic

Outgoing `set` patches assumed the target was a root-level block. A `set` triggered inside an editable container (callout body, code-block line, table cell) emitted a patch with a path that didn't reach the actual node. The patch generator now emits the full path, so consumers receive correctly-targeted patches regardless of how deep the change occurred.
