---
'@portabletext/steps': patch
---

fix: isolate numeric patch paths in transaction working copies

`interpretTransaction` no longer mutates its input value or throws when a
transaction inserts a block before a later patch addressed by numeric block
index.
