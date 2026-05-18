---
'@portabletext/editor': patch
---

fix: remove every container the range fully covers when deleting across containers

Cross-container range delete used to leave containers in place when the
selection fully covered them. Two scenarios surface this: selecting a
mix of editable containers (code-block, callout, table) and pressing
Delete left containers between the start and end shells; Cmd+A across
multiple containers and Delete left one or more containers behind.

The delete now walks up from each endpoint independently and removes
every container the range fully covers, regardless of how many sit
between the endpoints.
