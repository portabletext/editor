---
'@portabletext/plugin-table': patch
---

fix: stop publishing `src` on npm

The tarball carried `src/ui/styles.css` and its Node stub, because
`@portabletext/plugin-table/ui/styles.css` resolved into `src`. Those two files
ship from `styles/` now and `src` is gone from the package. The import specifier
is unchanged.
