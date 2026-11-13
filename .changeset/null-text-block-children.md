---
'@portabletext/editor': patch
---

fix: report `children: null` on a text block as invalid value

A text block with `children: null` no longer crashes validation. The editor emits an `invalid value` event that offers to reset `children` to an empty array. It does not apply the proposed patches.
