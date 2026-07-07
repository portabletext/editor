---
'@portabletext/plugin-table': minor
---

feat: add `tokens` to the reference `Table` for per-instance theming

Themes that only exist as runtime objects could not reach the plugin's
custom properties without writing them to a shared DOM scope themselves,
which breaks down when multiple tables need different values and when the
chrome portals outside the host's wrapper. `Table` now takes an optional
`tokens` record keyed by the documented `--pt-plugin-table-*` names and
applies the values inline to its own roots, including the portal layers.
The `TableTokens` type is exported from `@portabletext/plugin-table/ui`.
