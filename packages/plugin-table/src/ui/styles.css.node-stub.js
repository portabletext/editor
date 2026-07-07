// No-op shim for `styles.css` in runtimes that cannot import `.css` files
// directly (Node resolves the `./ui/styles.css` export here). Bundlers
// resolve the `browser`/`style` conditions and get the real stylesheet.
export default ''
