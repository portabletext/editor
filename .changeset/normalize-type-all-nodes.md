---
'@portabletext/editor': patch
---

fix: normalize missing `_type` on all nodes

Previously only root-level blocks had `_type` restored. Now any node missing `_type` gets normalized: children of text blocks default to the span type, everything else defaults to the text block type.
