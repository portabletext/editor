---
'@portabletext/plugin-markdown-shortcuts': patch
---

fix: respect the sub-schema at the focus when computing markdown shortcuts

The schema passed to consumer config callbacks (`headingStyle`, `unorderedList`, `orderedList`, `blockquoteStyle`, `horizontalRuleObject`, `linkObject`, `defaultStyle`) is now scoped to the focus block's sub-schema rather than the root schema. This means that typing markdown shortcuts inside a registered editable container (such as a code-block) only triggers the rule when the resulting style or list is allowed by the container's sub-schema, instead of consuming the keystroke and silently failing the resulting block change.
