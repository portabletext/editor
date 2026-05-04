---
'@portabletext/editor': patch
---

fix: stabilize `getSnapshot` field references between calls

`editor.getSnapshot()` returned a fresh shallow copy of the snapshot's selection and converters on every call, even when nothing had changed. Consumers using `useEditorSelector(editor, s => s.context.selection)` (or piping the editor through `useSyncExternalStoreWithSelector` directly) hit React's "infinite render loop" guard because every render saw a new reference. The snapshot now returns the live underlying references when the data hasn't changed, so equality checks short-circuit correctly.
