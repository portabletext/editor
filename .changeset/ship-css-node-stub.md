---
'@portabletext/plugin-table': patch
---

fix: ship the `styles.css` Node stub in the published package

1.1.3 pointed the `node`/`default` conditions of the `./ui/styles.css`
export at a file excluded from the tarball, so resolving the stylesheet
outside a browser bundler failed with a module-not-found error instead of
the intended no-op.
