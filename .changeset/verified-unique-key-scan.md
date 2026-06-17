---
'@portabletext/editor': patch
---

fix(perf): scan each sibling group for duplicate keys once instead of per node

Duplicate-`_key` normalization no longer slows down quadratically on large
sibling groups: a group's keys are checked once and the verdict reused until
the group changes, so bulk-inserting blocks or editing inside big documents
is faster. Duplicate keys are still detected and fixed the same way.
