---
'@portabletext/plugin-markdown-shortcuts': major
'@portabletext/plugin-character-pair-decorator': major
---

feat!: drop the deprecated `schema` and `level` callback params

The guard callbacks no longer receive the deprecated top-level `schema` (read `context.schema`) or, on `headingStyle`, the deprecated top-level `level` (read `props.level`).
