---
'@portabletext/sanity-bridge': patch
'@portabletext/block-tools': patch
'@portabletext/patches': patch
'@portabletext/editor': patch
---

fix: remove `lodash` dependency

1. Simple `lodash` usages like `uniq` and `flatten` have been replaced with
   vanilla alternatives.
2. Many cases of `isEqual` have been replaced by new domain-specific equality
   functions.
3. Remaining, generic deep equality checks have been replaced by a copy/pasted
   version of `remeda`s `isDeepEqual`.

This reduces bundle size and dependency surface while improving type-safety and
maintainability.
