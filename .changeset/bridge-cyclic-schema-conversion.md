---
'@portabletext/sanity-bridge': patch
---

fix: convert cyclic Portable Text schemas without recursing forever

If a block had an inline object or annotation that carried rich text
of its own, say a footnote whose body can contain another footnote,
converting the schema would spin forever and freeze the studio as
soon as a Portable Text field rendered. Now it converts: when the
same type comes around a second time, it is cut off instead of
expanded again. Schemas with well over a thousand types embedding
each other also no longer overflow the call stack.

If your schema converted fine before, the output is exactly the same.
