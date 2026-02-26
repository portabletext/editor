---
'@portabletext/editor': patch
---

fix: remove Editor-keyed WeakMaps from slate-dom, move state onto DOMEditor

WeakMaps are an upstream Slate pattern for supporting multiple editor instances sharing a module scope. Since PTE owns the editor lifecycle, storing state directly on the editor object is simpler and easier to debug.
