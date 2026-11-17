---
'@portabletext/editor': patch
---

fix: scroll the caret with selection() middleware

The editor scrolls the caret into view with the `selection()` middleware instead of replacing `getBoundingClientRect` on the leaf element. `scroll: 'if-needed'` still scrolls only when the caret is outside the view, and `block` and `inline` stay `'nearest'`.
