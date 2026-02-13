---
'@portabletext/editor': major
---

feat!: remove `change$` observable and `rxjs` dependency

The `PortableTextEditor.change$` observable isn't used internally anymore. It's
purely a legacy public API that allows consumers to read editor changes/events
through an Observable rather than through the ordinary subscription API. This
does not justify declaring `rxjs` as a peer dependency of PTE and therefore
this commit removes the `change$` Observable along with the `rxjs` dependency.

BREAKING CHANGES:
- Removed `PortableTextEditor.change$` property
- Removed `EditorChanges` type export (`Subject<EditorChange>`)
- Removed `PatchObservable` type export (`Observable<...>`)
- Removed `rxjs` from peerDependencies

Migration: Replace `change$.subscribe()` with `editor.on()` or
`<EventListenerPlugin on={...} />`. Every active `EditorChange` type
has a 1:1 equivalent in the new event API.

What's preserved:
- `EditorChange` type (still used by sanity's `onEditorChange` prop)
- `PortableTextEditor` class (separate deprecation path)
- All static methods and `schemaTypes` property

### Migration

Replace `change$.subscribe()` with `editor.on()` or `<EventListenerPlugin>`:

**Before (rxjs):**

```tsx
import {usePortableTextEditor} from '@portabletext/editor'

const editor = usePortableTextEditor()

useEffect(() => {
  const sub = editor.change$.subscribe((change) => {
    if (change.type === 'mutation') {
      // ...
    }
  })
  return () => sub.unsubscribe()
}, [editor])
```

**After (editor.on):**

```tsx
import {useEditor} from '@portabletext/editor'

const editor = useEditor()

useEffect(() => {
  const unsubscribe = editor.on('mutation', (event) => {
    // ...
  })
  return unsubscribe
}, [editor])
```

**After (EventListenerPlugin):**

```tsx
import {EventListenerPlugin} from '@portabletext/editor/plugins'

<EventListenerPlugin
  on={(event) => {
    if (event.type === 'mutation') {
      // ...
    }
  }}
/>
```

Every active `EditorChange` type has a 1:1 equivalent in the new event API. See the [event listener documentation](https://www.portabletext.org/reference/event-listener-plugin/) for details.
