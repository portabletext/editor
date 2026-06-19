---
'@portabletext/schema': patch
---

fix: inherit a nested block's sub-schema from its enclosing container, not always the root

A `{type: 'block'}` member nested inside a container now inherits any property it doesn't declare (`styles`, `decorators`, `annotations`, `lists`, `inlineObjects`) from the nearest enclosing container's block, falling back to the root only when no enclosing container declares a block of its own. Previously every absent property fell back to the root, so a block nested inside a container that restricts its own text (e.g. a callout limited to `strong`) could end up allowing more than its container. Schemas with single-level containers, or structural nesting where intermediate containers declare no block, are unaffected.
