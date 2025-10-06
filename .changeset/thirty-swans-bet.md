---
'@portabletext/plugin-input-rule': patch
---

fix: simplify code for input rule matching

Abstract common code and speed up logic by avoiding running regular expressions twice.
