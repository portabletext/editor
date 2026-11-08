---
'@portabletext/editor': patch
---

fix: deprecate the `hotkeys`, `onCopy`, `onCut`, and `onPaste` props

The `hotkeys`, `onCopy`, `onCut`, and `onPaste` props on `PortableTextEditable` are deprecated in favor of `keyboard.keydown`, `clipboard.copy`, `clipboard.cut`, and `clipboard.paste` Behaviors, respectively. The props keep working.
