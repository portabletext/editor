---
'@portabletext/plugin-emoji-picker': patch
'@portabletext/plugin-input-rule': patch
'@portabletext/plugin-typeahead-picker': patch
---

fix: adapt plugins to widened path types

Adjust path construction in the emoji and typeahead pickers to derive the target block prefix via `path.slice(0, -2)` instead of `path[0]._key`, so the plugins produce correct sibling paths regardless of how deep the focus span sits. Input rule block-offset comparisons use `isKeyedSegment` guards before reading the block key.
