---
'@portabletext/editor': minor
---

feat: simplify internal DOM mapping

Introduces a new `data-pt-path` attribute on editor DOM nodes to aid the mapping between the internal model and the DOM.

Path attributes use serialized paths like `data-pt-path="[_key=="k0"].children[_key=="s1"]"` for a text block span.
