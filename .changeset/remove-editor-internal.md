---
'@portabletext/editor': major
---

feat!: drop `editor` parameter from `useEditorSelector`

`useEditorSelector(selector)` now resolves the editor from React context instead of taking the editor as a parameter. Migrate by removing the first argument:

```diff
- const value = useEditorSelector(editor, selectors.getActiveStyle)
+ const value = useEditorSelector(selectors.getActiveStyle)
```

The `editor._internal` runtime field is also removed. The internal Slate editor and editable surface previously exposed via `editor._internal` are no longer reachable from outside the editor package. If you reached into `editor._internal` to drive raw machine events or read internal state, please open an issue with your use case.
