---
"@portabletext/editor": minor
---

feat: make selectors container-aware

Selectors that previously used `blockIndexMap` to resolve paths at the root level now compose node-traversal primitives so they resolve at any container depth. Selection points and paths inside editable containers are handled the same way as root-level points: a path inside a callout's text block, a code-block's line, or a table cell now flows through every selector without special casing.

Selectors covered: `getActiveAnnotations`, `getActiveDecorators`, `getAnchorBlock`, `getAnchorChild`, `getAnchorSpan`, `getAnchorTextBlock`, `getFirstBlock`, `getFocusBlock`, `getFocusBlockObject`, `getFocusChild`, `getFocusInlineObject`, `getFocusListBlock`, `getFocusSpan`, `getFocusTextBlock`, `getLastBlock`, `getMarkState`, `getNextBlock`, `getNextInlineObject`, `getNextInlineObjects`, `getNextSpan`, `getPreviousBlock`, `getPreviousInlineObject`, `getPreviousInlineObjects`, `getPreviousSpan`, `getSelectedChildren`, `getSelectedSpans`, `getSelectionEndBlock`, `getSelectionEndChild`, `getSelectionStartBlock`, `getSelectionStartChild`, `getSelectionText`, `getTextAfter`, `getTextBefore`, `isOverlappingSelection`.
