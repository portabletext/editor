---
'@portabletext/plugin-dnd': patch
---

fix(plugin-dnd): write drop position keys in the editor's path format

`useDropPosition` finds the drop position for a block by a string built from its path. That string now follows the editor's path format. An array index is written as `[2]` instead of `.2`, so it can no longer match a field named `"2"`, and a nested field named `true`, `false` or `null` is written as `["null"]`. Drop positions for keyed paths are found as before.
