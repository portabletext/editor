---
'@portabletext/markdown': patch
---

fix: bundle declarations per entry while keeping one JavaScript file per module

`@portabletext/markdown` ships its types as a single `dist/index.d.ts` again, the same file 2.8.0 shipped, while its JavaScript stays one file per source module. In 2.8.1 the types were also split into one file per module, which made them name files inside `dist` that `exports` does not expose. The JavaScript, the bundle size and the public types are unchanged.
