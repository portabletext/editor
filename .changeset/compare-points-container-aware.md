---
"@portabletext/editor": patch
---

fix: compare selection points at any depth

`isPointBeforeSelection` and `isPointAfterSelection` returned the wrong answer for points inside a container's text block, because the underlying point comparison only walked the root segment of each path. Pickers and other consumers that ask whether a point is before or after the current selection (emoji picker, typeahead picker) now resolve correctly inside containers.
