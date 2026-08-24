---
'@portabletext/plugin-dnd': patch
---

fix: suppress the native drop caret while an edge indicator is shown

The browser's own drop caret used to keep rendering at the hovered text position even while an edge indicator was shown, suggesting a mid-text split that would never happen: the drop snaps to the block edge instead. The native caret now hides exactly while an edge position is active and returns as soon as the drag hovers mid-text, where it's the honest affordance again.
