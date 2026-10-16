---
'@portabletext/editor': patch
---

fix: run every structural repair before tidying

When a local edit leaves a node that needs both a structural repair (a missing `_key`, `_type`, `children` or span `text`, or an inline object without a span on either side) and tidying (merging adjacent spans, dropping empty spans, default `style` or `markDefs`), the editor now emits the repair patches first. Previously the two were interleaved. The patches themselves and the resulting value are unchanged, so only code that asserts on the exact order of emitted patches sees a difference. Patches from remote edits are unaffected.
