---
'@portabletext/editor': patch
---

fix: remove a block or span when `set` gives it a non-object value

A `set` of a block or span to a value that is not an object, such as `null` or a string, now removes it. Before, the block stayed on screen while the host received `set null`, so anything typed in it afterwards was lost.
