---
'@portabletext/editor': patch
---

fix: render large block lists in chunks at every depth

Typing in a large document no longer rebuilds an element for every block in the list being edited. At 20,000 root blocks, a keystroke improves from about 180ms to 81ms. Typing 20 keys in a 2,000-block callout improves from about 930ms to 660ms. Splitting a block with Enter at 8,000 root blocks improves from about 104ms to 51ms. Block lists at the editor root and inside registered containers render in chunks whose elements are reused unless their blocks or container scope changed. Blocks keep their DOM nodes when chunks split or merge, so the caret, selection and IME composition are unaffected and the rendered DOM is unchanged. A chunk an edit leaves with 50 blocks or fewer is merged into a neighbour when the two hold 200 blocks or fewer together.
