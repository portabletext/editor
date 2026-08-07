---
'@portabletext/plugin-table': patch
---

fix: stop publishing `src` on npm

The tarball carried `src/ui/styles.css` and a hand-written Node stub, because
`@portabletext/plugin-table/ui/styles.css` resolved into `src`. The stylesheet
now ships minified from `dist` next to a generated no-op shim for runtimes that
cannot load `.css` files, and `src` is gone from the package. The import
specifier is unchanged, and the `light-dark()` tokens still resolve against the
consumer's `color-scheme`.

The package also declares `sideEffects: ["*.css"]`, so bundlers keep the
stylesheet instead of tree-shaking the import away.
