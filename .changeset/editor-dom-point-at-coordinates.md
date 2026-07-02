---
'@portabletext/editor': minor
---

feat: add `editor.dom.getPointAtCoordinates`

Pass viewport coordinates (for example a pointer event's `clientX`/`clientY`) and get back where a click at those coordinates would place the caret, as an editor selection point, or `null` when the coordinates don't hit the editor's content:

```ts
const point = editor.dom.getPointAtCoordinates({
  x: event.clientX,
  y: event.clientY,
})
// {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3}
```

It's the counterpart of `editor.dom.getSelectionRect`: that one turns a selection into pixels, this one turns pixels back into a point. Behavior guards and actions get it on their `dom` argument.
