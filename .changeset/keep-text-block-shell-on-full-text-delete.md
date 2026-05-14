---
'@portabletext/editor': patch
---

fix: preserve a text block's shell when delete covers all of its text and the block is registered with a custom render

When a consumer registers a custom render for a text block inside a container (e.g. `defineTextBlock({type: 'block', render})` nested in a callout's `of` array), selecting all of its text and pressing Delete used to remove the text block entirely. The shell is now preserved with an empty placeholder span inside, matching the behavior for object-level editable containers and for plain text blocks.
