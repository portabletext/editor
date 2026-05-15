---
'@portabletext/editor': patch
---

fix: strip `data-slate-node` and emit `data-pt-block-type="text"` on text blocks rendered via `defineTextBlock` inside a container

A text block registered via `defineTextBlock` and nested inside a container's `of` array was passing its `attributes` straight through to the consumer's `render` callback. Because `attributes` carries `data-slate-node="element"` from the underlying Slate layer, the consumer's outer wrapper element re-emitted that legacy attribute alongside the PT namespace.

The container DOM contract is `data-pt-*` only - no `data-slate-*` leakage. The fix strips `data-slate-node` and injects `data-pt-block-type="text"` into the `attributes` handed to the text block's render callback, matching the behavior of the engine-default text-block branch inside containers.
