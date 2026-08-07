---
"@portabletext/editor": patch
---

fix: inherit active decorators when `insert.blocks` merges a fragment span at a caret in a text block

When the abstract `text/plain` deserializer raises `insert.span`, the pasted text inherits the caret's active decorators. Consumer behaviors that bypass that path - for example a markdown deserializer that catches `deserialize.data` and raises `deserialization.success` directly with a block whose spans carry empty marks - went through the engine's fragment-merge path, which dropped the caret context and inserted the spans bare. Pasting inside a bold span would land the new text unbolded.

The fragment-merge path now copies the decorators of the span at the caret onto any fragment span with no marks, matching the abstract `insert.span` behavior. Spans that arrive with their own marks are left alone. Annotation refs are not inherited; those continue to be threaded explicitly via `event.annotations`.
