---
'@portabletext/plugin-table': patch
---

fix: resolve the `./ui/styles.css` export to a no-op module in Node

Importing the stylesheet from code that also runs outside a browser
bundler (server-side rendering, Node scripts importing a consuming
package) crashed Node's ESM loader, which cannot import CSS. The export
now carries resolution conditions: bundlers resolve `browser`/`style` to
the real stylesheet, Node and unknown resolvers get an empty JS module.
