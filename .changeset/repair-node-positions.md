---
'@portabletext/repair': major
---

fix!: stop setting `text` and `children` on spans and text blocks in the wrong place

`span-text` and `missing-children` no longer set `text` or `children` on a span or text block in the wrong place, such as a span where a block belongs or a text block inside another text block's `children`. Code that relied on those corrections must apply them itself.
