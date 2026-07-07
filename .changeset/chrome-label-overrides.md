---
'@portabletext/plugin-table': minor
---

feat: add `labels` to the reference `Table` for chrome string overrides

The chrome's rendered strings (aria-labels and tooltips) were hardcoded
English. `Table` now takes an optional `labels` record, merged over the
defaults, with keys `add-column`, `add-row`, `column-handle`,
`delete-column`, `delete-row`, `insert-here`, `menu-delete-table`,
`menu-header-row`, `menu-select-table`, `row-handle`, and
`table-options`. The `TableLabels` type is exported from
`@portabletext/plugin-table/ui`. The `menu-*` keys only render when the
built-in menu does; a `renderMenu` widget carries its own strings.
