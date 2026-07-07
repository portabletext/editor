---
'@portabletext/plugin-table': minor
---

feat: export the stylesheet as `stylesText` for hosts without a CSS pipeline

`@portabletext/plugin-table/ui` now exports the reference UI's stylesheet as text, generated from `styles.css` so the two cannot diverge. Hosts whose build cannot import a CSS file inject it through whatever styling system they already have, for example a styled-components `createGlobalStyle`. Hosts with a bundler keep importing `@portabletext/plugin-table/ui/styles.css` as before.
