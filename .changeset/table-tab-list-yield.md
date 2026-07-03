---
'@portabletext/plugin-table': patch
---

fix: `Tab` inside a list item in a cell indents instead of navigating

Cell navigation yields `Tab`/`Shift+Tab` to the editor's list handling when the caret sits in a list item, so indenting and unindenting inside cells works; navigation keeps `Tab` everywhere else in a cell.
