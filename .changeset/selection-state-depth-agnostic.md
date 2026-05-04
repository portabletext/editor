---
"@portabletext/editor": patch
---

fix: make selection state depth-agnostic

The internal selection state machine now stores selection points as full paths instead of shallow block/child indices. Selection events fired by behaviors and operations carry the right path regardless of how deep the selection sits, so consumer-side selection observers see consistent values.
