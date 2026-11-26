---
'@portabletext/editor': patch
---

fix: insert the unsent empty paragraph before patched edits target it

Setting the empty paragraph's style to `normal`, clearing its `markDefs`, or clearing its span's `marks` now sends the paragraph before the property patch. Hosts applying the emitted patches receive the same value as `change.value`, including when the edit leaves the paragraph empty.
