---
'@portabletext/editor': patch
---

fix: scroll the selection to the nearest edge instead of centering

Selecting out-of-view content now scrolls the minimal distance to bring the focus to the nearest viewport edge, matching native caret behavior. Previously any selection whose focus was even slightly out of view, including programmatic selects like a table handle click whose rectangle ends in an off-screen column, re-centered the whole editor on the focus point.
