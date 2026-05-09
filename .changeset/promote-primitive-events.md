---
'@portabletext/editor': minor
---

feat: promote primitive operations as `@alpha` behavior events

Five primitive events expose the apply-layer surface to plugins that need to express tree mutations the synthetic tier doesn't cover: `set`, `unset`, `insert`, `remove.text` are new, and `insert.text` evolves to accept optional `at` and `offset` (existing callers raising `{type: 'insert.text', text}` keep working). Plugins composing structural moves can now raise `[unset, insert]` directly instead of working around the synthetic shape.
