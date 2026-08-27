---
'@portabletext/editor': minor
---

feat: add `editor.registerRangeDecorations` and `RangeDecorationsPlugin`

Range decorations used to have exactly one entry point: the `rangeDecorations` prop on `PortableTextEditable`. Plugins and other code without access to that prop had no way to draw one. `editor.registerRangeDecorations` and the `RangeDecorationsPlugin` sugar component register additional, independent sources, composed with the prop and with each other:

```tsx
import {RangeDecorationsPlugin} from '@portabletext/editor/plugins'

function SearchHighlights({matches}) {
  return (
    <RangeDecorationsPlugin
      rangeDecorations={matches.map((match) => ({
        id: match.id,
        range: match.range,
        component: (props) => <mark>{props.children}</mark>,
      }))}
    />
  )
}
```

The plugin is sugar over the editor method, which returns `update` and `unregister` directly for code that manages its own lifecycle, for example wiring presence off a collaboration session. Like `BehaviorPlugin`, the plugin assumes stable `rangeDecorations`; `on` may be inline, the plugin always calls the latest handler.

```tsx
const presence = editor.registerRangeDecorations({
  rangeDecorations: [],
  on: (event) => {
    if (event.type === 'moved') {
      savePeerRange(event.rangeDecoration.id, event.newRange)
    }
  },
})

session.on('presence', (peers) => {
  presence.update(
    peers.map((peer) => ({
      id: peer.sessionId,
      range: peer.selection,
      component: (props) =>
        props.isFirst ? (
          <Caret user={peer.user}>{props.children}</Caret>
        ) : (
          <>{props.children}</>
        ),
    })),
  )
})

// on teardown
presence.unregister()
```

Call `update` when your data changes; between calls the editor transforms registered decorations through edits by itself, so an `update` with an unchanged `range` keeps the live, edit-adjusted position rather than reverting it. `on` isn't needed for rendering; it receives `{type: 'moved'}` events for persisting a re-anchored `range`, or for learning that a decoration's range was deleted (`newRange: null`). A decoration that died this way stays dead through redundant `update` calls carrying its old range, and revives by a genuinely changed `range`, or by omitting its `id` from one `update` call and re-adding it.

New exports: `registerRangeDecorations` on `Editor`, `RangeDecorationsPlugin`, `RegistrableRangeDecoration`, `RangeDecorationEvent`, and `RangeDecorationRenderProps` (now shared with the legacy `rangeDecorations` prop, see below). `component` receives `isFirst`/`isLast` alongside `children`: `isFirst` is `true` for the rendered fragment containing the decoration's range start point, `isLast` for the one containing its end, and both are `true` for a collapsed decoration's single fragment.

Decorations from every source flatten into one rendered order: every `PortableTextEditable`'s prop decorations first (in mount order when there's more than one editable), then each registration in the order it was made, regardless of mount order, nesting outer-to-inner across sources the same way array order nests within one source.

The legacy `RangeDecoration` type is unchanged apart from that render-props widening: `payload` and the `selection`/`newSelection` vocabulary stay as they were, no `id`. Code holding `RangeDecoration[]` for its own registration needs a stable `id` and the `range` field name to move to the registration API: `rangeDecorations.map(({selection, payload, onMoved, ...rest}) => ({...rest, id, range: selection}))`, with `onMoved`'s handling moved to the registration's `on`.

Two `PortableTextEditable`s under one `EditorProvider` no longer clear each other's decorations, and an editable's prop decorations are removed from the shared editor when it unmounts, instead of lingering.
