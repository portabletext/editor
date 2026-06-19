---
"@portabletext/editor": minor
---

feat: drag a container by its chrome to drop the whole container

**Drag and copy out of a container reflect what's inside.** Selecting an image inside a table cell drags just the image. With a draggable image (or other draggable child) inside a container, selecting across multiple sibling blocks and grabbing by that image drags those blocks, not the surrounding container. A nested code block grabbed by its chrome inside a table cell drags that code block, not the whole table.

**Grabbing a container by its chrome drags the whole container.** When the drag originates on the container itself (not on its children), the serializer carries the container intact. Drops and pastes preserve the container when the destination accepts its type, and unwrap to accepted descendants when it doesn't.

**Internal-move source-deletion follows the destination fit.** When the destination accepts the dragged blocks whole, the source is removed at the root path. When the destination unwraps them, the source is removed per inner block. No more empty container shells left behind after a move.

**The drag pipeline no longer mutates `snapshot.context.selection`.** During a drag, the model selection stays where it was before `dragstart`. The drag selection lives on `event.position.selection` for the duration of the gesture, and on `event.originEvent.position.selection` through the serialize/deserialize boundary. If you had a behavior reading `editor.getSnapshot().context.selection` mid-drag to learn the dragged unit, read it from the event instead.
