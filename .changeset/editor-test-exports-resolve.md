---
'@portabletext/editor': patch
---

fix: publish `./test` and `./test/vitest` entry points that resolve

Importing `@portabletext/editor/test` or `@portabletext/editor/test/vitest` from
an installed copy failed: both pointed into `src`, which the package does not
publish. They resolve to built output now.
