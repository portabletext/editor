---
'@portabletext/editor': patch
---

feat: make the internal Slate tree structurally closer to Portable Text

Remove the `value` wrapper and `__inline` flag from the Slate tree. Object
properties are now spread directly on the Slate node. Inline vs block status
is determined by schema lookup and tree position instead of a flag.

Introduce `ObjectNode` as a third node type alongside `Element` and `Text`.
`ObjectNode` represents block objects and inline objects - nodes with semantic
content but no children or text. Harden Slate core traversal, normalization,
and editor-layer operations to handle `ObjectNode` correctly.

No `ObjectNode` instances exist in the tree yet - this is pure type system
preparation. Internal refactor with no public API changes.
