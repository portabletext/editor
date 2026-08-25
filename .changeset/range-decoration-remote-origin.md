---
'@portabletext/editor': patch
---

fix: report `remote` origin in `onMoved` when remote operations move a range decoration

A range decoration's `onMoved` callback now reports `origin: 'remote'` when the edit that moved or removed the decoration came from a remote patch, matching the documented `RangeDecorationOnMovedDetails.origin` type. Previously `onMoved` always reported `'local'`, even for remote edits.
