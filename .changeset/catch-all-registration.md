---
'@portabletext/editor': minor
---

feat: catch-all node registration via `'*'` for `defineBlockObject`, `defineInlineObject`, `defineTextBlock`, and `defineSpan`

Pass `type: '*'` to register a render callback that handles any `_type` that has no specific registration. A single `defineBlockObject({type: '*', render})` plays the role of the legacy `renderBlock` callback; `defineTextBlock({type: '*', render})` plays the same role for text blocks; `defineInlineObject({type: '*', render})` and `defineSpan({type: '*', render})` mirror `renderChild`.

Resolution order (most specific wins):

1. Positional registration for the exact `_type` (inside a container's `of`)
2. Positional `'*'` (inside a container's `of`)
3. Global registration for the exact `_type`
4. Global `'*'`
5. Engine default

`defineContainer` does not accept `'*'` — a container is a structural commitment that the editor needs to know about up front. Trying to do so is a compile-time error.
