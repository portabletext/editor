---
'@portabletext/editor': patch
---

fix: name the entry's real index in invalid-value resolutions

Resolutions for non-object blocks and blocks missing a `_key` now target the entry's actual position in the value. Accepting a resolution for an entry after the first removes or repairs that entry without overwriting or deleting the first block.
