---
'@portabletext/editor': patch
---

fix: apply removals from structural corrections

The editor removes a non-empty string, a non-zero number or `true` arriving by remote insert, `initialValue` in a container, or `update value` into a text block inside a container.
