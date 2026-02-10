---
'@portabletext/editor': patch
---

fix: use `set` instead of `setIfMissing` + `insert` when target value is empty

When a remote Portable Text field had a `null` value (as opposed to `undefined`
or `[]`), typing or pasting into the editor would produce patches that failed to
apply on the receiving end. This is because `setIfMissing` treats `null` as
"present", so the subsequent `insert` would attempt to insert into `null` rather
than an array.
