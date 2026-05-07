---
'@portabletext/editor': patch
---

fix: remove every container the range fully covers when deleting across containers

A delete range that fully covers more than one editable container (Cmd+A across multiple code-blocks, or selecting all of two callouts) used to leave one or more containers behind. The cross-container range delete now walks up from each endpoint independently and removes every container the range fully covers, regardless of how many of them sit between the endpoints.
