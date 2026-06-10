---
"@portabletext/editor": patch
---

fix: key patch generation off the operation's own pre-apply value

Patches emitted through `patch` and `mutation` events could be computed against a value that already included the edit when that edit triggered normalization, producing incorrect text diffs and unset payloads. Each operation's patches are now derived from the value exactly as it was before that operation applied.
