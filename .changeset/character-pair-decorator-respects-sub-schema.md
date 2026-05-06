---
'@portabletext/plugin-character-pair-decorator': patch
---

fix: respect the sub-schema at the focus when computing the decorator

The schema passed to the consumer's `decorator` config callback is now scoped to the focus block's sub-schema rather than the root schema. Inside a registered editable container that doesn't declare the matched decorator (such as a code-block-line), typing a character pair like `*foo*` no longer toggles the decorator: the consumer's callback returns `undefined` because the decorator isn't in the sub-schema, and the existing `if (decorator === undefined) return false` guard rejects.
