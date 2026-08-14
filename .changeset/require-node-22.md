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

feat!: require node 22.12 or later

Node.js 22.12 or later is now required. The previous range also allowed Node.js 20.19 and later; Node.js 20 reached end of life in April 2026 and is no longer supported. `@portabletext/editor` and `@portabletext/markdown` also move to `@portabletext/to-html` v6 and `@portabletext/toolkit` v6, which carry the same Node.js requirement.
