---
'@portabletext/editor': patch
---

fix: flush pending native selection changes before acting on sent events

Events sent with `editor.send`, and `PortableTextEditor` methods such as `toggleMark`, `insertBlock`, and `select`, now act on the latest selection change the browser has reported. Previously, an event sent right after a click (within about 100 ms) could act at the position from before the click, and the click then moved the caret, so a `select` back to the current position could be lost. `focus` and `blur` are unchanged.
