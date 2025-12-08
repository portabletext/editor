---
"@portabletext/editor": patch
---

Bundle Slate packages to prevent version conflicts

Slate packages (`slate`, `slate-dom`, `slate-react`) are now bundled into the `@portabletext/editor` output instead of being external dependencies. This prevents issues when multiple versions of `@portabletext/editor` exist in the same application, where shared `slate-dom` instances could cause WeakMap and state conflicts.

