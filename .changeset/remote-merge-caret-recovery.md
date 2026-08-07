---
'@portabletext/editor': patch
---

fix: re-resolve the caret when remote patches move, absorb, or split off its span

When a collaborator's edit merges the span the caret sits in (for example unbolding text so adjacent spans join), merges its block into the previous one with Backspace, or splits the block before the caret with Enter, the caret now keeps its text position instead of jumping to a span boundary. In the split case the caret follows the content it sat in into the new block; previously it stayed clamped at the end of the truncated block. Recovery is scoped to the caret's block and its adjacent siblings and only applies when the text mapping is exact; in every other case, including duplicate span keys elsewhere in the document (which block splits produce routinely), the previous behavior stands.
