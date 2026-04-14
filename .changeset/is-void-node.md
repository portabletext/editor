---
'@portabletext/editor': patch
---

fix: introduce `isVoidNode` for container-aware void checks

Adds an `isVoidNode` function that checks whether a node is a void (non-editable) object node. This replaces `isObjectNode` at call sites that treat object nodes as atomic/opaque, which is incorrect for editable containers. `isVoidNode` composes `isObjectNode` with `isEditableContainer` to distinguish void objects from containers with editable content.
