---
'@portabletext/editor': patch
---

fix: make `insert.block` depth-agnostic

`editor.send({type: 'insert.block', ...})` and the Enter key inside a container now insert the new block at the right depth: a new line in a code-block lands inside the code-block's lines, a new paragraph in a callout lands inside the callout's content, splitting the existing block in two when the caret sits in the middle.
