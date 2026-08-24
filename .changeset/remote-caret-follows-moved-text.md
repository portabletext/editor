---
'@portabletext/editor': patch
---

fix: follow text moved by remote splits, merges, and block reorders when recovering the caret

The caret now follows content a collaborator's split, merge, block reorder, or decorator/annotation edit relocates, instead of collapsing to the edit's boundary. A remote block split moves a caret sitting in the tail into the new block; a remote span or block merge keeps the caret at the same character position instead of snapping to the end of the merged span; a remote block reorder keeps a caret inside the block instead of losing it to the reorder's own removal step. Edits that don't match one of these shapes are unaffected: the caret falls back to its previous boundary behavior.
