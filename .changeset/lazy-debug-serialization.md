---
'@portabletext/editor': patch
---

fix: guard debug calls to avoid eager serialization

The editor's debug logging was always serializing event payloads via
`JSON.stringify` regardless of whether debug was enabled. For an insert
of 1000 blocks that meant ~3000 redundant serializations per render
cycle in production. Debug calls now serialize lazily so the cost is
only paid when the relevant debug namespace is on.
