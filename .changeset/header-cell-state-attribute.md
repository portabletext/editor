---
'@portabletext/plugin-table': patch
---

fix: mark header cells with `data-pt-plugin-table-header` for host CSS

Header cells set their weight through an inline style, which only reaches
text that inherits. Hosts whose text components declare their own weight
can now restore it with a rule against the new attribute (see the README's
Theming section). The weight itself becomes a theming token,
`--pt-plugin-table-header-weight` (default `600`), consumed by the cell and
the drag ghost alike.

All plugin-rendered state attributes now carry the full
`data-pt-plugin-table-` prefix: the previously undocumented `data-selected`
(selected rows) and `data-cell-range` (the table while a rectangle is
active) become `data-pt-plugin-table-selected` and
`data-pt-plugin-table-cell-range`.
