---
'@portabletext/editor': patch
---

fix: bypass editor methods for DOM input events

DOM input events now route directly to the behavior system instead of going through Editor methods first. This moves event handling closer to the source, giving more control over how input is processed.
