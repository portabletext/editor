---
'@portabletext/editor': patch
---

fix: replace internal `useGenericSelector` with `useSyncExternalStore`

Replaces the internal `useGenericSelector` hook with React's built-in `useSyncExternalStore` in `useSlateSelector` and `useDecorations`, and deletes `useGenericSelector` entirely. No changes to public API or observable behavior.
