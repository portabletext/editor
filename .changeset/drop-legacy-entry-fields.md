---
'@portabletext/block-tools': major
'@portabletext/editor': major
'@portabletext/html': major
'@portabletext/keyboard-shortcuts': major
'@portabletext/markdown': major
'@portabletext/patches': major
'@portabletext/plugin-character-pair-decorator': major
'@portabletext/plugin-dnd': major
'@portabletext/plugin-emoji-picker': major
'@portabletext/plugin-input-rule': major
'@portabletext/plugin-list-index': major
'@portabletext/plugin-markdown-shortcuts': major
'@portabletext/plugin-one-line': major
'@portabletext/plugin-paste-link': major
'@portabletext/plugin-sdk-value': major
'@portabletext/plugin-table': major
'@portabletext/plugin-typeahead-picker': major
'@portabletext/plugin-typography': major
'@portabletext/sanity-bridge': major
'@portabletext/schema': major
'@portabletext/test': major
'@portabletext/toolbar': major
'racejar': major
---

feat!: drop the legacy `main` and `module` fields

Every package now declares its entry points through the `exports` map only. Node, all maintained bundlers, and TypeScript (`moduleResolution: 'bundler'`, 'node16', or 'nodenext') resolve through `exports`; only tooling that predates `exports` support read `main` or `module` and can no longer resolve these packages.
