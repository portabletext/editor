---
'@portabletext/editor': patch
---

fix: preserve marks the schema cannot resolve

The editor no longer removes marks it doesn't recognize: they render
as plain text and survive the round-trip. Previously, removing a
decorator from the schema deleted that formatting from existing
documents and could merge spans and corrupt their text.
