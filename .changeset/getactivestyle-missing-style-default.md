---
'@portabletext/editor': patch
---

fix: report the sub-schema default style from `getActiveStyle` for blocks missing `style`

`getActiveStyle` now reports the block's sub-schema default style (its first declared style) when the block carries no `style` field, instead of `undefined`. Observable for values adopted without the field; toolbar style selectors stay populated on such blocks. A sub-schema declaring no styles still reports `undefined`.
