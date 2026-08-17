---
'@portabletext/editor': minor
---

feat: promote the surviving render-prop types from beta to public

`RenderPlaceholderFunction`, `RenderEditableFunction`, and `ScrollSelectionIntoViewFunction` are now `@public`: editor-chrome hooks with no replacement on the horizon.

The content-rendering props stay `@beta`: `RenderAnnotationFunction`, `RenderDecoratorFunction`, and their prop types alongside the already-deprecated `RenderBlockFunction`, `RenderChildFunction`, `RenderStyleFunction`, and `RenderListItemFunction`.
