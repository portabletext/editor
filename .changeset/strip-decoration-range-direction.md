---
'@portabletext/editor': patch
---

fix: omit selection direction from mapped decoration ranges

Registered decoration events keep reporting live ranges as `{anchor, focus}`
when the registered input came from a backward editor selection. A content
edit that leaves the decoration in place no longer copies the input's
`backward` field into the event range.
