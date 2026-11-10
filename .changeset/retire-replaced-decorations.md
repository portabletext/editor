---
'@portabletext/editor': patch
---

fix: retire range decorations when their original text is replaced

Typing or pasting over all text covered by a range decoration now removes the
decoration permanently. Replacement text inserted by the same change does not
revive it, even when that text is identical.
