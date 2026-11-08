---
'@portabletext/editor': patch
---

fix: resolve negative indexes in remote patch paths from the end of the array

Remote patches with negative indexes now resolve from the end of the array at any depth, like Sanity. A negative index that falls before the start of the array changes nothing, except that an insert at `-1` into an empty array still inserts.
