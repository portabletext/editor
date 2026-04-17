---
'@portabletext/editor': patch
---

fix: stabilize span keys when writing between marks

Typing next to decorated or annotated text no longer replaces the span
the character lands in. Previously, when the active marks matched the
span at the caret (or the span right after it, when typing at a span
boundary), the editor inserted a fresh span with a fresh `_key` and
merged it away; anything keyed on span identity (diff views,
content-lake patches, presence and comment anchors) saw a span vanish
and an unfamiliar one appear. The character now flows into the existing
span, and its `_key` is preserved.
