---
"@portabletext/editor": patch
---

fix: delete container when selection hangs around it

A selection that "hangs" past the end of a container (the focus point sits just past the container's last block) used to leave the container in place when the selection was deleted, even though the container had no remaining content. The unhang logic now treats editable containers the same way it treats void blocks: a hanging range over a container removes the container as a unit.
