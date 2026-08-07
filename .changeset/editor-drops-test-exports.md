---
'@portabletext/editor': patch
---

fix: remove the `./test` and `./test/vitest` export subpaths

Neither has ever resolved from the published package: both pointed at `src`
files the tarball does not contain. They are internal test helpers for this
monorepo, so they are no longer declared as exports at all. Nothing that
resolved before stops resolving.
