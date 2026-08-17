---
'@portabletext/editor': major
---

feat!: emit one default DOM, dropping the legacy classes and data attributes

Unregistered nodes (text blocks, block objects, inline objects, and spans rendered outside any `defineTextBlock`/`defineBlockObject`/`defineInlineObject`/`defineSpan` registration) now render through the same engine defaults as a registered node whose registration omits `render`. The DOM the engine emits for a node no longer depends on whether that node's type happens to be registered.

Removed from the engine's DOM entirely:

- Classes: `pt-block`, `pt-text-block`, `pt-text-block-style-*`, `pt-list-item`, `pt-list-item-*`, `pt-list-item-level-*`, `pt-object-block`, `pt-inline-object`
- Data attributes: `data-block-key`, `data-block-name`, `data-block-type`, `data-child-key`, `data-child-name`, `data-child-type`, `data-style`, `data-list-item`, `data-level`
- The `pt-editable` class on the root editable (a consumer-passed `className` still applies; there is no more engine-supplied default)

`data-pt-*` attributes are unaffected: `data-pt-editor`, `data-pt-path`, `data-pt-block`, `data-pt-inline`, `data-pt-marks`, `data-pt-text`, `data-pt-spacer`, `data-pt-zero-width`, and `data-pt-line-break` keep working exactly as before, as does `data-read-only` on the root.

The engine also no longer draws its own drop indicator during block drags. Where a dragged block would land is pointer-driven UI; [`@portabletext/plugin-dnd`](https://github.com/portabletext/editor/tree/main/packages/plugin-dnd) tracks the drop position from the editor's public `drag.*` events, the same store the engine's own indicator used to read from.

To migrate: style or query content on the `data-pt-*` attributes instead of the removed classes and data attributes, and replace any styling that leaned on the built-in drop indicator with your own render reading `@portabletext/plugin-dnd`'s drop position. Registering the node with a `defineTextBlock`/`defineBlockObject`/`defineInlineObject`/`defineSpan` render remains the way to emit your own attributes and hooks in their place.
