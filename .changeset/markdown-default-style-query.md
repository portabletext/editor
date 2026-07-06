---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: only query `defaultStyle` when backspace can clear a style

The `defaultStyle` callback (and the sub-schema resolution feeding it) ran on every backspace with a collapsed text-block selection; it now runs only when the caret sits at the start of the block, the one position where a style can clear. Consumers with throwing or expensive callbacks see them called far less often.
