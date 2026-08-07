---
'@portabletext/test': patch
---

fix: publish an export map without the unresolvable `source` condition

The published `exports` map carried a `source` condition pointing at
`./src/index.ts`, which this package does not publish, so resolvers configured
for that condition — bundlers and monorepo tooling — resolved to a file the
tarball does not contain. The published map points at `dist` only now.
