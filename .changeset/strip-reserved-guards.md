---
'@portabletext/editor': patch
---

fix: strip reserved property guards from incoming patches

`_key`, `_type`, `children`, and `text` were previously blocked from being set or unset via incoming patches. These guards are removed. The patch goes through and normalization restores valid state if needed.
