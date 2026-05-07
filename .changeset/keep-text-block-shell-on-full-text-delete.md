---
'@portabletext/editor': patch
---

fix: preserve a text block's shell when delete covers all of its text and the block is registered as an editable container

When a consumer registers a text block itself as an editable container (e.g. a callout's content block via `defineContainer({scope: '$..callout.block', field: 'children'})`), selecting all of its text and pressing Delete used to remove the text block entirely. The shell is now preserved with an empty placeholder span inside, matching the behavior for object-level editable containers and for plain text blocks.
