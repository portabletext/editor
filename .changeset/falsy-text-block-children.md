---
'@portabletext/editor': patch
---

fix: report `children` set to `false`, `0` or `''` on a text block as invalid value

A text block with `children` set to `false`, `0` or `''` no longer crashes validation. Like `null`, these values now make the editor emit an `invalid value` event that offers to reset `children` to an empty array. The editor no longer stays read-only on such a start value.
