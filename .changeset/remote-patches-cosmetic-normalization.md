---
'@portabletext/editor': patch
---

fix: skip cosmetic normalization while applying remote patches

Adjacent same-mark spans and empty sibling spans arriving through remote patches are now kept as-is instead of being merged away by the receiving editor. Those merges were emitted and pushed back at the originator, so two people editing the same block concurrently could see formatting silently revert and the tail of the block duplicate. The unmerged structure renders identically and is canonicalized on the block's next local edit; `update value` still normalizes loaded documents, and structural repairs (missing keys, types, required fields) still run on every path.
