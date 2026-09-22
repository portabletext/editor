---
'@portabletext/editor': patch
---

fix: declare `@sanity/diff-match-patch` as a runtime dependency instead of inlining it

The package now declares `@sanity/diff-match-patch` as a regular dependency instead of bundling a private copy into its build output. `@portabletext/patches`, which the editor already depends on, installs the same package, so this removes a second, potentially different, copy of the library that used to ship inside the editor's own bundle.
