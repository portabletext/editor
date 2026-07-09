---
'@portabletext/editor': patch
---

fix: expand marks the schema cannot resolve when typing at span edges

Typing at the edge of a span whose mark the schema cannot resolve now
extends the span, the way decorators behave. Previously such marks
were treated as annotations and escaped, so the typed text started a
new unmarked span next to the marked one.
