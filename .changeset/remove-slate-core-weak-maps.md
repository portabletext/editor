---
'@portabletext/editor': patch
---

fix: remove WeakMaps from Slate core, move state onto editor object

WeakMaps are an upstream Slate pattern for supporting multiple editor instances sharing a module scope. Since PTE owns the editor lifecycle, storing state directly on the editor object is simpler and easier to debug.
