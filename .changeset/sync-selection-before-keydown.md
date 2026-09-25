---
'@portabletext/editor': patch
---

fix: sync the pending DOM selection before raising `keyboard.keydown`

`keyboard.keydown` behaviors, custom hotkeys, and `onKeyDown` handlers now see the caret where the user last put it. Previously, a key pressed within about 100 ms of moving the caret, for example with a click, could run against the caret's previous position.

One additional change: while a key that moves the selection is held (Shift+Arrow, ArrowUp, ArrowDown), the editor updates its selection and emits `selection` events on every key repeat instead of at most ten times a second, as ArrowLeft and ArrowRight already did.
