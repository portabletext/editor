---
'@portabletext/plugin-dnd': patch
---

fix: suppress the drop indicator when dragging a nested block over itself

Dragging a block nested inside a container (a callout's paragraph, a table cell's content) and hovering it over its own position no longer shows a drop indicator there. Indicators already rendered on the correct nested block for drops elsewhere in a container; only the self-drop suppression was still comparing at the container's root level and missed the nested case.
