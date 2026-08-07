---
'@portabletext/block-tools': patch
'@portabletext/editor': patch
'@portabletext/html': patch
'@portabletext/keyboard-shortcuts': patch
'@portabletext/markdown': patch
'@portabletext/patches': patch
'@portabletext/plugin-character-pair-decorator': patch
'@portabletext/plugin-dnd': patch
'@portabletext/plugin-emoji-picker': patch
'@portabletext/plugin-input-rule': patch
'@portabletext/plugin-list-index': patch
'@portabletext/plugin-markdown-shortcuts': patch
'@portabletext/plugin-one-line': patch
'@portabletext/plugin-paste-link': patch
'@portabletext/plugin-sdk-value': patch
'@portabletext/plugin-table': patch
'@portabletext/plugin-typeahead-picker': patch
'@portabletext/plugin-typography': patch
'@portabletext/sanity-bridge': patch
'@portabletext/schema': patch
'@portabletext/test': patch
'@portabletext/toolbar': patch
'racejar': patch
---

fix: add a `module` entry point

Every package now declares `module` alongside `main`, pointing at the ESM build.
Bundlers that predate `exports` use it to pick the ESM output instead of falling
back to `main`.
