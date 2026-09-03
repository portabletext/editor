---
'@portabletext/plugin-dnd': patch
---

fix: stop clearing the drop position on `dragenter`

Crossing a block boundary during a drag no longer clears and re-sets the drop position. `dragenter` precedes every `dragover` on a crossing, so clearing on it toggled the indicator and wrote the editor's caret color twice per crossing; on large pages each style write costs a layout reflow. The caret color and the indicator now only change when the drop position genuinely transitions, and the drop position still clears on `dragstart`, `dragend`, `dragleave`, and `drop`.
