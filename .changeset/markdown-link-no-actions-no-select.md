---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: do not consume the keystroke when a markdown link rule has no `linkObject` to apply

When the consumer's `linkObject` callback returns `undefined` (for example because the focus block's sub-schema does not declare a link annotation), the rule no longer consumes the keystroke or moves the caret. Previously the rule unconditionally raised a `select` action at the end of typing, which moved the caret to the end of the matched text even though no annotation could be applied.
