---
'@portabletext/schema': patch
---

fix: warn once when reading the deprecated `value` on compiled schema types

Reading `value` on a compiled style, list, or decorator now logs a one-time console warning naming `name` as the replacement. Any read counts, including spreading or serializing the object (`{...style}`, `JSON.stringify`, `toEqual` in a test), not only `style.value` directly. The value returned is unchanged, and assigning `value` still works. The warning fires once per process no matter how many objects or types are read, so it won't flood the console. `value` is removed in the next major.
