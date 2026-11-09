---
'@portabletext/editor': minor
---

feat: load the first value in the editor's first commit with `load`

`editor.send({type: 'load', value})` hands the editor its first value from a plugin's mount effect, before the editor is ready. `ready` then fires with the whole value in the snapshot, and `status` is already `'ready'` inside the listener. The value goes in during the first commit and is normalized once at the end of it. A second `load` in the same commit replaces the first. `undefined` and `[]` both give the empty editor.

Loading is not an edit: it emits no `change`, `patch` or `mutation` event and adds no undo step. Only a fix the editor makes to the loaded value is emitted, as a `change` with `correction: true`. Non-object entries, such as `null`, are dropped from the loaded value at every depth.
