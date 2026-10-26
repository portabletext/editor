---
'@portabletext/markdown': patch
---

fix: honor a function `block` renderer in `portableTextToMarkdown`

The `block` option accepts either a map of renderers by style or a single function for every block. A single function is now used. Previously it was ignored and every block rendered with the default renderers:

```ts
portableTextToMarkdown(blocks, {
  block: ({value, children}) => `[${value.style}] ${children}`,
})
// Now:        "[h1] Title\n\n[normal] Body"
// Previously: "# Title\n\nBody"
```
