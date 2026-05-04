---
'@portabletext/editor': patch
---

fix: only unwrap object-level editable containers on Backspace and Delete

The empty-container unwrap (Backspace or Delete in an empty editable container) now fires only for object-level container registrations (`defineContainer({scope: '$..fact-box'})`). Block-level registrations (`defineContainer({scope: '$..fact-box.block'})`) stay rendering-only and don't dissolve when emptied, so consumers can register a container purely for layout without inheriting unwrap behavior.
