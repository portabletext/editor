---
'@portabletext/editor': patch
---

fix: dedupe `'selection'` emissions by semantic equality

`'selection'` events could fire twice in a row with the same anchor, focus, and direction when an internal selection reference changed without the caret actually moving (for example after applying a remote patch on the span the caret is inside). Consumers wiring `'selection'` to focus state would race against their own caret-driven UI. The guard now compares the selection by value.
