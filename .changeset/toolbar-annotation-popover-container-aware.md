---
'@portabletext/toolbar': patch
---

fix: open the annotation popover when the annotated text block is inside an editable container

The annotation popover hook constructed its target path as `[{_key: focusBlock._key}, 'markDefs', {_key: annotation._key}]`, hardcoding a depth-2 path that only resolved at the document root. Annotations on text blocks inside callouts, fact-boxes, table cells, or any other editable container silently noop'd when the popover tried to set or remove them. The hook now uses the focus block's full path, so annotation actions work at any depth.
