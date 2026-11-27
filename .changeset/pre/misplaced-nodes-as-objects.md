---
'@portabletext/editor': patch
---

fix: draw a misplaced span or text block as an object

A span where a block belongs, or a text block inside another text block's `children`, is now drawn as an object box, not as editable text. The editor keeps these nodes as received and sends no correction patches for them. A collaborator's misplaced span no longer crashes the editable. Backspace just after a misplaced text block removes it and joins the text around it.

The traversal functions in `@portabletext/editor/traversal` treat these nodes as objects. `getSpan` and `getTextBlock` return nothing for them. `getBlock` and `isLeafObject` treat a misplaced span as a block object, and `getText` returns `''` for it. `getChildren`, `getNode` and `getNodes` do not go into a text block inside another text block's `children`, and `getAnnotation` does not read its `markDefs`.

`getFocusChild` and `getAnchorChild` return a text block inside a text block's `children` as an inline object. Inline object bracketing can add an empty span beside it, as it does beside any inline object.
