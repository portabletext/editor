---
'@portabletext/editor': patch
---

fix: arrow navigation out of nested containers walks all ancestors

The arrow dead-end check looked at the innermost editable container only, so being at the last text block of a nested container (e.g. the last list-item in a list) wrongly suppressed the native arrow key even when an ancestor container had a sibling at the document root. The check now walks container ancestors and only suppresses navigation when every ancestor up to the root is at its edge.
