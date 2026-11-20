---
'@portabletext/plugin-list-index': patch
---

fix(plugin-list-index): write list index keys in the editor's path format

`useListIndex` finds the list number for a block by a string built from its path. That string now follows the editor's path format. An array index is written as `[2]` instead of `.2`, so it can no longer match a field named `"2"`, and a nested field named `true`, `false` or `null` is written as `["null"]`. List numbers for keyed paths are unchanged.
