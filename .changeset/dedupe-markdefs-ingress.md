---
'@portabletext/editor': patch
---

fix: repair duplicate `markDefs` when a value arrives

A document arriving with the same mark definition twice (same `_key`) is repaired on arrival: the first copy wins, and the repair is written back with the user's first edit. Duplicate keys made patch addressing ambiguous, so unlike the deferred cleanup rules this one is treated as a validity repair.
