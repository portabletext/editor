---
'@portabletext/editor': patch
---

fix: require a collapsed selection for the forward-delete empty-block hop

Selecting a range that ends in an empty block (highlighting empty lines, for example) and pressing Delete now deletes the whole range. Previously the forward-delete rule that hops a caret past an empty block also matched expanded selections, so only the block at the focus edge was affected and the covered empty lines remained. Backspace was unaffected.
