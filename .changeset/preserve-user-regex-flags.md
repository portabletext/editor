---
'@portabletext/plugin-input-rule': patch
---

fix: preserve safe flags consumers set on `InputRule.on`

The plugin compiled the rule's regex with a fixed `gd` flag set, silently dropping any flags the consumer had on the source pattern. A rule like `/\[!(note|tip)\]/i` would never fire for `[!NOTE]` because the rebuilt matcher was case-sensitive.

The plugin now preserves a known-safe subset of consumer flags - `i`, `m`, `s`, `u` - while keeping `g` and `d` under its own control. Sticky (`y`) is also stripped: it would conflict with the plugin's `matchAll` loop, which slices and re-feeds text after each match.