---
'@portabletext/plugin-paste-link': patch
---

fix: respect the sub-schema at the focus when computing the link annotation

The schema passed to the consumer's `link` matcher is now scoped to the focus block's sub-schema rather than the root schema. Inside a registered editable container that does not declare the link annotation, pasting a URL is left to default paste handling instead of being wrapped in a link annotation that the sub-schema does not allow. The active-decorator filter when pasting at the caret is also scoped to the sub-schema.
