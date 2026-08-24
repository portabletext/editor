---
'@portabletext/editor': major
---

feat!: add optional `blocks` to the `serialize.data` event

A `serialize.data` Behavior can now `forward` the event with a `blocks` array attached: the fragment to serialize in place of the snapshot's selection-derived fragment. This is how an upstream Behavior narrows or replaces what gets serialized for a mime type, a table plugin forwarding a rectangular cell selection instead of the linear fragment between its corners, for example. Core's converters and any custom `serialize.data` Behavior should read `event.blocks` and prefer it over deriving a fragment from `snapshot.context.selection` when it's set.
