---
'@portabletext/editor': patch
---

fix: name the actual mismatch in container registration warnings

Registering a container that doesn't match the schema still warns and skips the registration, but the warning now names what is actually wrong. A type that isn't in the schema is reported as an unknown type instead of a missing field, a field that exists but isn't an array is reported as such, and a primitive-only array field produces a single warning instead of two contradictory ones. Code that matches on the exact warning strings will see the new texts.
