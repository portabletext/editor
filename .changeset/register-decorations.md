---
'@portabletext/editor': minor
---

feat: add `editor.registerDecorations`, a registration channel for decoration layers

`editor.registerDecorations({decorations, onMapped?})` registers a set of decorations independent of any `PortableTextEditable`'s `rangeDecorations` prop, and returns a `DecorationRegistration`: `update(decorations)`, `unregister()`, and `getDecorations()`, a fresh `Array<{id, range}>` of the live, edit-adjusted positions at call time (empty before the editor's `ready` event). Registered decorations keep transforming and delivering `onMapped` mappings while the editor is read-only, so a read-only viewer wired to a live document (remote edits still applying) sees them track correctly. The `rangeDecorations` prop keeps its existing read-only behavior.

Each decoration is `{id, type: 'range', range, render}`: `id` is the identity `update()` reconciles by (duplicates throw, and a throwing `update()` leaves the registration unchanged), `type` discriminates the decoration's anchor shape (only `'range'` exists today), `range` is a non-nullable editor selection, and `render` is a plain-called factory receiving `{children, isFirst, isLast}` (`isFirst`/`isLast` mark the fragments carrying the decoration's start/end point, both `true` when collapsed). The same `id` registered through two different `registerDecorations` calls addresses two independent decorations: unregistering one leaves the other's alone.

Decorations from every source render in this order:

- Each `PortableTextEditable`'s own `rangeDecorations` prop, outermost
- Then each `registerDecorations` call, in the order it was made
- Within one source, array order nests first-outermost

`onMapped` receives one `DecorationMapping` per engine operation that moved, touched, or destroyed one of the registration's decorations, one entry per affected decoration: `{id, previousRange, newRange, contentTouched, origin}`. `newRange` is `null` when the operation destroyed the decoration (deleting exactly the decorated text counts: an expanded decoration collapsed to zero length by an edit is destroyed, while a decoration that is collapsed by configuration, like a presence caret, never dies from staying collapsed), and carries over the same object reference as `previousRange` when the operation didn't move it. `contentTouched` reflects whether the operation actually changed content inside the decoration's range, including for a destroying operation. `onMapped` fires synchronously, mid-apply (do not dispatch editor events from it), is fixed at registration, and never fires before the editor's `ready` event or from `update()`'s own reconciliation. Undo does not revive a decoration once it has died: reviving it takes a fresh `update()` with a different range, or dropping and re-adding its `id`.

```ts
const registration = editor.registerDecorations({
  decorations: [defineDecoration({id: 'match-1', type: 'range', range, render: MatchHighlight})],
  onMapped: (mappings) => {
    // {id: 'match-1', previousRange, newRange, contentTouched, origin}
  },
})

registration.update([{id: 'match-1', type: 'range', range: nextRange, render: MatchHighlight}])
registration.getDecorations() // [{id: 'match-1', range: nextRange}]
registration.unregister()
```

`Decoration`, `DecorationRenderProps`, `DecorationMapping`, `DecorationPosition`, and `DecorationRegistration` are the new exported types, and `defineDecoration` is an identity helper in the `defineSchema` tradition: it gives a `Decoration` literal contextual typing and autocomplete without a type annotation, and accepts every member of the union. It is unrelated to `defineDecorator`, which defines a schema mark like `strong`.

One additional change: two `PortableTextEditable`s under one `EditorProvider` previously fed one shared source, so the second editable's prop replaced the first's outright. Each editable's prop is now its own composed source: both coexist, and unmounting an editable removes only its own contribution.
