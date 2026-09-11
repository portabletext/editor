---
'@portabletext/markdown': patch
---

fix: return stored blocks verbatim when the edit did not touch them

A block whose spans carried a mark, decorator, or custom style the markdown dialect cannot express lost that structure through a no-op edit: two spans split only by an unmappable mark came back merged into one, and the mark itself vanished, even though nothing had touched that block. `applyMarkdownEdit` now recognizes when a block's canonicalized stored form and the parsed edited markdown agree exactly, proof that everything the dialect can express is untouched and everything it cannot express was invisible to the edit, and returns that block exactly as stored: span structure, marks, mark definitions, and any custom field included, at every depth. A block the edit did touch still comes back canonicalized, same as before.
