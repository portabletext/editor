---
'@portabletext/editor': patch
---

fix: remove every container the range fully covers when deleting across containers

Selecting an entire mix of editable and structural containers (e.g. a code-block, a callout and a table) and pressing Delete now removes all of them. Previously the operation removed the start and end shells but left any container fully covered between them in place.
