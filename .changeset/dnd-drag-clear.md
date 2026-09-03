---
'@portabletext/plugin-dnd': patch
---

fix: stop clearing the drop position on continuous `drag` events

Dragging a block no longer forces a layout reflow on every pointer move. The browser fires `drag` on the dragged element continuously during a drag, and the plugin treated each one as an end-of-drag signal: it cleared the drop position and restored the editor's caret color, only for the next `dragover` to set both back. The two style writes per pointer move invalidated layout right before the editor's own drag handling read element rects, so every move paid a full-page reflow that grew with document size, and the drop indicator visibly trailed the pointer in large documents (~12ms per event at 300 blocks with sibling fields mounted, now ~1.5ms, flat across document sizes). The drop position now clears on `dragend`, `dragleave`, `drop`, and `dragstart`, not on `drag`.
