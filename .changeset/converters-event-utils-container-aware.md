---
"@portabletext/editor": patch
---

fix: make converters, event resolution, and block-offset utilities container-aware

Aligns the rest of the observer side of the editor with the depth-agnostic shift in selectors. The plain-text converter resolves inline and block object titles through the selection-anchor block's sub-schema. `event-position.ts` resolves DOM event paths via the enclosing block, so drag and drop land correctly inside containers. `apply-selection.ts` threads `editor.containers` through block-offset resolution so selection points land at the right place inside container-nested text blocks. The block-offset family of utilities (`util.block-offset.ts`, `util.compare-points.ts`, `util.split-text-block.ts`, `util.at-the-beginning-of-block.ts`) accept container-aware traversal context. A new `getDefaultStyle` selector returns the first style of the sub-schema at the selection focus.
