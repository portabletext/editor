---
'@portabletext/editor': minor
---

feat: make selectors container-aware

Selectors that previously used `blockIndexMap` to resolve paths at the root level now compose node-traversal primitives so they resolve at any container depth. Selection points and paths inside editable containers are handled the same way as root-level points: a path inside a callout's text block, a code-block's line, or a table cell now flows through every selector without special casing. `getSelectedValue` and `getSelectedTextBlocks` return the correct portable text slice when the selection sits inside, spans across, or fully covers an editable container (container shells preserved, partial content trimmed) regardless of depth.

Selectors covered: `getActiveAnnotations`, `getActiveDecorators`, `getAnchorBlock`, `getAnchorChild`, `getAnchorSpan`, `getAnchorTextBlock`, `getFirstBlock`, `getFocusBlock`, `getFocusBlockObject`, `getFocusChild`, `getFocusInlineObject`, `getFocusListBlock`, `getFocusSpan`, `getFocusTextBlock`, `getLastBlock`, `getMarkState`, `getNextBlock`, `getNextInlineObject`, `getNextInlineObjects`, `getNextSpan`, `getPreviousBlock`, `getPreviousInlineObject`, `getPreviousInlineObjects`, `getPreviousSpan`, `getSelectedChildren`, `getSelectedSpans`, `getSelectedTextBlocks`, `getSelectedValue`, `getSelectionEndBlock`, `getSelectionEndChild`, `getSelectionStartBlock`, `getSelectionStartChild`, `getSelectionText`, `isOverlappingSelection`.
