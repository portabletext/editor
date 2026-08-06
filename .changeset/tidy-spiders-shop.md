---
'@portabletext/plugin-table': patch
---

fix: stop publishing `src` on npm

`./ui/styles.css` resolved to `src/ui/styles.css`, so the tarball had to carry
those two source files alongside `dist`. The stylesheet and the stub Node
resolves in its place now live in `styles/`, which is published as a build
artifact in its own right; the import specifier is unchanged.
