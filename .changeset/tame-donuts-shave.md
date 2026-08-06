---
'@portabletext/test': patch
---

fix: publish an export map without the unresolvable `source` condition

This package had no `publishConfig.exports`, so it published its development
`exports` map verbatim, `source` condition included. That condition points at
`./src/index.ts`, which `files: ["dist"]` never publishes, so any resolver
honouring `source` — bundlers and monorepo tooling configured for it — resolved
to a file the tarball does not contain. It now publishes a map that points at
`dist` only.
