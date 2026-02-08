---
'@portabletext/editor': patch
---

fix: prevent misidentifying objects with 'text' field as spans

This issue caused updates to object fields named 'text' to end up in a nested
`value` object on the object itself.
