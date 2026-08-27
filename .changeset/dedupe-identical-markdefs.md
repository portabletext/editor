---
'@portabletext/editor': patch
---

fix: dedupe identical same-key markDefs on every block merge

Splitting a block through the middle of an annotation and merging it back together rejoins the annotation into a single definition, instead of leaving two identical definitions under different keys. Backspace and forward delete at a block boundary get the same treatment: an annotation definition arriving in a block that already holds an identical one under the same `_key` keeps its key instead of being renamed, so anything tracking the annotation keeps following it.
