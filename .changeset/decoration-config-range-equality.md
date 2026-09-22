---
'@portabletext/editor': patch
---

fix: keep a decoration's live position when a resupplied range differs only in extra selection keys

`registerDecorations`' `update()` no longer treats a range differing only in extra keys (like `backward` on a captured selection) as a re-anchor, so the decoration keeps its live, edit-adjusted position.
