---
'@portabletext/editor': patch
---

fix: publish `./test` and `./test/vitest` entry points that resolve

Both entry points pointed at `./src/test/…` in `exports` and
`publishConfig.exports` alike, against `files: ["lib"]`, so they resolved to
files the tarball does not contain. They are built now and resolve to `lib`.
