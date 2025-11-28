---
'@portabletext/editor': patch
---

fix: use correct empty text block check when applicable

In some cases, when inserting blocks with `placement: 'auto'`, the focus block can get removed if it is an empty text block. This fix makes sure we use the proper heuristics to determine if a text block is empty (no text). In some cases, the wrong asserter function was used, causing empty headings or list items to not be treated as empty.
