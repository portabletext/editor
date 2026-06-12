---
'@portabletext/editor': minor
---

feat: expose `dropPosition` and `listIndex` on text-block and block-object render-props

`defineTextBlock` and `defineBlockObject` now receive engine-derived signals that aren't available on the value:

- `dropPosition: 'start' | 'end' | undefined` — set mid-drag when this block is the current drop target. Consumers using a custom `render` can show their own drop affordance (or delegate via `renderDefault`).
- `listIndex: number | undefined` on `TextBlockRenderProps` — 1-based running index of a list-item within its visible list run (level-aware, resets across non-list interrupts). Now resolves correctly for list-items inside containers; each container is its own list-counter scope.

`defineBlockObject` and `defineInlineObject` render-props also receive `draggable` on `attributes` so browser drag-and-drop works without the consumer having to opt in manually.
