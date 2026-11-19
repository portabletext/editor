# Value in and out

The editor owns the value after mount. `initialConfig` (including `initialValue`, `schemaDefinition` and `keyGenerator`) is read once, so passing a new `initialValue` on rerender does nothing. Everything after mount goes through events: you listen for what the editor emits and you send it what changed elsewhere.

## Outgoing changes

A user action and the fixes it causes arrive as one local `change`, with their `patches` in order. Fixes to received content are their own local changes. Remote changes carry no `patches`. Listen with `editor.on('change', listener)` (it returns `{unsubscribe}`) or with `EventListenerPlugin` from `@portabletext/editor/plugins`. To send a burst of changes in one message, listen with `{batch: true}`. Read live state with `useEditorSelector`, not from `change`.

## Incoming changes from other writers

Send other writers' changes with `apply`:

```tsx
import {useEditor, type Patch} from '@portabletext/editor'
import {useEffect} from 'react'

// The channel must not deliver this client's own patches back to it.
type Channel = {
  publish: (patches: Array<Patch>) => void
  subscribe: (listener: (patches: Array<Patch>) => void) => () => void
}

export function SyncPlugin(props: {channel: Channel}) {
  const editor = useEditor()
  const {channel} = props

  useEffect(() => {
    const changeSubscription = editor.on(
      'change',
      (events) => {
        const patches = events.flatMap((event) =>
          event.origin === 'local' ? event.patches : [],
        )
        if (patches.length > 0) channel.publish(patches)
      },
      {batch: true},
    )

    const unsubscribe = channel.subscribe((patches) => {
      editor.send({type: 'apply', patches})
    })

    return () => {
      changeSubscription.unsubscribe()
      unsubscribe()
    }
  }, [editor, channel])

  return null
}
```

- Incoming patches are applied as remote. They create no undo step, emit no outgoing patches, and are normalized afterwards.
- Never feed the editor its own patches. `apply` treats every patch as another writer's, so an echo is applied again. Non-idempotent patches (`insert`, `diffMatchPatch`) then apply twice and duplicate text. Have the server skip the sender when it broadcasts, or tag what you publish with a client id and drop your own echoes before you send.
- The patches need no `origin` and there is no `snapshot` to pass. One undo removes the user's last edit and leaves the remote change in place.
- A remote `unset` at the root path (`[]`) wipes undo history. Do not "sync" by sending a whole-document `unset` followed by a `set`.
- On the server, `applyAll(value, patches)` from `@portabletext/patches` applies a batch to a stored value.

## Switching documents

Remount the provider with a key to switch documents or show a new snapshot of the same document:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type PortableTextBlock,
} from '@portabletext/editor'

const schemaDefinition = defineSchema({})

export function NoteEditor(props: {
  noteId: string
  initialValue: Array<PortableTextBlock>
}) {
  return (
    <EditorProvider
      key={props.noteId}
      initialConfig={{schemaDefinition, initialValue: props.initialValue}}
    >
      <PortableTextEditable />
    </EditorProvider>
  )
}
```

The new key gives a new engine, the new value and an empty undo history. The alternatives fail:

- Changing `initialValue` without a key does nothing, because `initialConfig` is read once.
- There is no public event that clears history. Remounting is the way to reset.
