---
"@portabletext/editor": patch
---

fix: detect "at the beginning of block" at any depth

`isAtTheBeginningOfBlock` read the focus child key from `path.at(2)` (root-only). When the selection focus pointed inside a container's text block, the lookup returned undefined and the function reported the caret was not at the start. Lists inside containers now toggle correctly when the caret is at the start of a block.
