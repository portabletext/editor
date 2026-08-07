---
'@portabletext/editor': patch
---

fix: declare the test helpers' test-framework imports as optional peer dependencies

The published `./test` and `./test/vitest` entry points import `vitest`,
`vitest/browser`, `vitest-browser-react`, `racejar` and `@portabletext/test` at
runtime, so consumers of those entry points have to bring them along. They are
now declared as optional peer dependencies, which is what that requirement
already was in practice; consumers of the other entry points are unaffected.
