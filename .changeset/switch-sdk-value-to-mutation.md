---
'@portabletext/plugin-sdk-value': patch
---

fix: switch SDKValuePlugin from patch to mutation event

Switch from `editor.on('patch')` to `editor.on('mutation')` to reduce
SDK store updates from N-per-keystroke to 1-per-action. The mutation
event batches patches by operation and debounces during typing (250ms).
It also includes the editor value, avoiding an extra snapshot read.
