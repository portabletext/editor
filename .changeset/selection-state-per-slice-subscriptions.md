---
'@portabletext/editor': patch
---

fix: subscribe per-component to selection slices, not the whole `SelectionState`

Every visible container, text block, block object, inline object and span used to read the full `SelectionState` from a single React context. When the selection moved (every keystroke), the context value reference changed and every consumer re-rendered, even when its per-component `focused`/`selected` status hadn't flipped. O(N) wrapper re-renders per keystroke where N is the number of visible blocks - the consumer's `render` callback fired for every block on every character typed.

The provider now keeps a single computed `SelectionState` on an external store and exposes four per-slice hooks (`useIsFocusedContainer`, `useIsSelectedContainer`, `useIsFocusedLeaf`, `useIsSelectedLeaf`) that each subscribe to one boolean. A character typed into one block re-renders that block; siblings stay put.
