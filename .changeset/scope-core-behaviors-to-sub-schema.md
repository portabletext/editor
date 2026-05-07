---
'@portabletext/editor': patch
---

fix: scope decorator, annotation, list, and style lookups to container sub-schema in core behaviors

Behaviors that gate on what is "available" at the current focus now read from the applicable block sub-schema instead of the root schema. Mark-continuation on `insert.text`, focused-decorator partition on `insert.break`, the annotation-stripping guard on `delete.text`, and `list item.add` (which now applies per-block when the selection crosses sub-schemas instead of bailing globally) all consult the path's sub-schema. Decorator keyboard shortcuts (Cmd+B / Cmd+I / Cmd+U / Cmd+E) intercept whenever the decorator is declared anywhere in the editor's schema graph, and the underlying `decorator.add` operation filters spans against their own block's sub-schema - so a selection that crosses blocks where some declare the decorator and others don't applies the mark to the in-scope subset and skips the rest.
