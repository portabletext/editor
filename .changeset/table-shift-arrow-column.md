---
'@portabletext/plugin-table': patch
---

fix: extend the selection down the column on `Shift+ArrowDown` and `Shift+ArrowUp` in a table

With the caret in a table cell, `Shift+ArrowDown` and `Shift+ArrowUp` now grow the table selection to the cell directly below or above, the way plain arrow keys move the caret. Previously the selection spread sideways to the next cell in the same row. Once the selection spans cells, each press adds or removes a whole row. In the bottom or top row, the selection extends into the block beyond the table when there is one, and stays put when there is none.
