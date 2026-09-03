---
'@portabletext/editor': patch
---

fix: guard `drag` and `dragleave` handlers without resolving an event position

The editor no longer runs a caret hit-test and block rect reads for every `drag` and `dragleave` event during a drag. Both events forward to behaviors without a position, so the resolution was pure per-pointer-move cost; the handlers now only check that the event target belongs to the editor. In rare cases where position resolution would have failed (for example while the editor is tearing down mid-drag), the `drag.drag` and `drag.dragleave` behavior events now still fire.
