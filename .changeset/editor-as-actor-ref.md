---
"@portabletext/editor": minor
---

feat: editor is a Subscribable<EditorSnapshot>

The editor now exposes `subscribe(observer)` directly, satisfying the React 18 external-store contract (`subscribe` + `getSnapshot`). `useEditorSelector(editor, selector, compare?)` forwards to `@xstate/react`'s `useSelector`, which itself wraps `useSyncExternalStoreWithSelector`. Consumers that want to bypass `@xstate/react` can pipe the editor into `useSyncExternalStore` directly.

The runtime `_internal` field is gone. Selectors and hooks consume the editor object directly.
