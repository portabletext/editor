---
"@portabletext/editor": patch
---

fix: emit `diffMatchPatch` patches when typing inside a container

Typing inside an editable container emitted no `diffMatchPatch`, so the change was lost when consumers persisted patches instead of full document state. The typing pipeline now emits the same `diffMatchPatch` for in-container text that it emits for root-level text.
