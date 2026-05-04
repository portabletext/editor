---
'@portabletext/editor': patch
---

fix: use keyed paths in the rendering pipeline

The rendering pipeline used numeric paths (`[0, 1, 2]`) which change
when blocks are inserted or removed earlier in the document. That
caused React's element memo to invalidate on every block render even
when the block itself was unchanged. Keyed paths
(`[{_key: 'k0'}, ...]`) are stable across sibling shifts so memoized
elements are reused. Append and prepend of large numbers of blocks are
materially faster.
