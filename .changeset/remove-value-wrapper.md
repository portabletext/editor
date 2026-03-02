---
'@portabletext/editor': patch
---

Remove the `value` wrapper and `__inline` flag from the internal Slate tree.

Object element properties are now spread directly on the Slate node instead of
being nested in a `value` sub-object. Inline vs block status is determined by
schema lookup and position in the tree rather than an `__inline` flag. This is
an internal refactor with no public API changes.
