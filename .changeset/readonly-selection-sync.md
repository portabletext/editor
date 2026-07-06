---
'@portabletext/editor': patch
---

fix: sync the selection in read-only editors

Selections made in a read-only editor never reached the editor's model:
the selection sync bailed unless the editable was the document's active
element, which a read-only editable never is. Consumers saw a frozen
selection (stale selection-derived UI stuck on screen after switching to
read-only) and copying selected content put nothing on the clipboard
since `serialize` read an outdated selection. The model now tracks the
selection in read-only editors, so selection-derived rendering and copy
work; editing remains blocked as before.
