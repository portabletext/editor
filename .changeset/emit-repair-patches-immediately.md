---
'@portabletext/editor': patch
---

fix: emit repair patches immediately instead of parking them until the first edit

Opening a document whose value contains structurally invalid content (children without a `_key`, spans without `text`, missing or empty `children` arrays, duplicate keys) now emits the fixing patches as soon as the value settles, instead of holding them back until the first local edit. Read-only editors emit them too, and pending patches are no longer dropped when an editor unmounts while read-only. Repairs to blocks past the first, which previously never emitted at all, are included.

Two deltas ride along: repair patches carry `origin: 'local'`, and the missing-child-`_key` repair emits a minimal `set` on the `_key` field instead of a `set` replacing the whole child.
