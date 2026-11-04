# Value in and out

The editor owns the value after mount. `initialConfig` (including `initialValue`, `schemaDefinition` and `keyGenerator`) is read once, so passing a new `initialValue` on rerender does nothing. Everything after mount goes through events: you listen for what the editor emits and you send it what changed elsewhere.

## Outgoing changes

Two emitted events carry the user's changes as patches.

- `mutation` carries `patches` and `value`. It is batched: it flushes 250 ms after typing stops, and on a 1 second interval for other pending work. Use it to save.
- `patch` fires once per patch, right away. Use it when you stream every operation, for example over a socket.

Listen with `editor.on(type, listener)` (it returns `{unsubscribe}`) or with `EventListenerPlugin` from `@portabletext/editor/plugins`.

Do not drive UI from `mutation`. Its debounce makes it lag while the user types. Read live state with `useEditorSelector`.

## Incoming changes from other writers

Send other writers' changes as patches:

```tsx
import {
  useEditor,
  type Patch,
  type PortableTextBlock,
} from '@portabletext/editor'
import {useEffect} from 'react'

// The channel must not deliver this client's own patches back to it.
type Channel = {
  publish: (patches: Array<Patch>) => void
  subscribe: (
    listener: (
      patches: Array<Patch>,
      snapshot: Array<PortableTextBlock>,
    ) => void,
  ) => () => void
}

export function SyncPlugin(props: {channel: Channel}) {
  const editor = useEditor()
  const {channel} = props

  useEffect(() => {
    const mutationSubscription = editor.on('mutation', (event) => {
      channel.publish(event.patches)
    })

    const unsubscribe = channel.subscribe((patches, snapshot) => {
      editor.send({
        type: 'patches',
        patches: patches.map((patch) => ({...patch, origin: 'remote'})),
        snapshot,
      })
    })

    return () => {
      mutationSubscription.unsubscribe()
      unsubscribe()
    }
  }, [editor, channel])

  return null
}
```

- Incoming patches are applied as remote. They create no undo step, emit no outgoing patches, and are normalized afterwards.
- Mark other writers' patches `'remote'`, and never feed the editor its own patches. Only patches with `origin: 'local'` are dropped on the way in, so an echo marked `'remote'` is applied again. Non-idempotent patches (`insert`, `diffMatchPatch`) then apply twice and duplicate text. Have the server skip the sender when it broadcasts, or tag what you publish with a client id and drop your own echoes before you mark the rest `'remote'`.
- `snapshot` is the full value after the patches, as the server holds it. History stores it to rebase local undo steps over remote edits. One undo then removes the user's last edit and leaves the remote change in place.
- A remote `unset` at the root path (`[]`) wipes undo history. Do not "sync" by sending a whole-document `unset` followed by a `set`.
- On the server, `applyAll(value, patches)` from `@portabletext/patches` applies a batch to a stored value.

## `update value`

`editor.send({type: 'update value', value})` hands the editor the host's latest full snapshot.

- A snapshot equal to the previous one the host sent is ignored, even if the editor has diverged through local edits since.
- Any other snapshot is reconciled block by block against the editor's current content. Every block that differs is replaced by the snapshot's version. That includes blocks with local edits the snapshot does not contain yet, so those edits are lost.
- It emits no `patch` or `mutation`, adds no undo step, and does not clear undo history.

Use it only for a new snapshot of the same document that already includes everything the editor emitted, for example after a save round trip when nothing local is in flight. To apply other writers' changes while the user edits, send `patches`.

## Switching documents

Remount the provider with a key:

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

- `update value` with the other document swaps the content but keeps the first document's undo stack. If the two documents share block keys (common with templates), one undo replays an edit from document A into document B.
- Changing `initialValue` without a key does nothing, because `initialConfig` is read once.
- There is no public event that clears history. Remounting is the way to reset.
