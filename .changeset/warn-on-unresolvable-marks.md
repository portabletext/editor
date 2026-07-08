---
'@portabletext/editor': patch
---

fix: warn when a mark or annotation cannot be resolved

The warning names the value, states that it is kept but does not
render, and says what to add to the schema to render it.
