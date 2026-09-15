---
'@portabletext/sanity-bridge': patch
---

fix: compile Portable Text fields named after Sanity built-in types

A Portable Text field whose `name` is one of Sanity's built-in type names (`text`, `image`, `url`, `slug`, ...) previously failed to compile with `Block type is not defined in this schema (required)`, even though the block was defined: the built-in type silently replaced the field's own definition. Any field name compiles now.

Passing an already-compiled schema type that is not an array throws a clear diagnostic, `Expected an array schema type but received '<name>' (jsonType: '<type>').`, with an added sentence naming the collision when the name matches one of Sanity's built-ins.
