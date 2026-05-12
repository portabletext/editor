---
'@portabletext/plugin-input-rule': patch
---

fix: `plugin-input-rule` preserves safe flags set on `InputRule.on`

The plugin compiled the rule's regex with a fixed `gd` flag set, silently dropping any flags the consumer had on the source pattern. A rule like `/\[!(note|tip)\]/i` would never fire for `[!NOTE]` because the rebuilt matcher was case-sensitive.

The plugin now preserves a known-safe subset of consumer flags - `i`, `m`, `s`, `u` - and lets them flow through both full-match and capture-group paths. The plugin keeps managing `g` and `d` itself; user-set `g`/`d` are dropped to avoid `Invalid flags` errors. Sticky (`y`) is also stripped because it conflicts with the plugin's `matchAll` loop, which slices and re-feeds text after each match.