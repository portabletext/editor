---
'@portabletext/plugin-sdk-value': patch
---

fix: don't latch the value-sync machine on patches emitted while read-only

A read-only editor that receives a structurally invalid value (for example a block missing its `_key`) repairs it and emits the repair patch immediately. Previously the plugin mistook that repair for an unsaved user edit and stopped applying store updates until it was pushed, which cannot happen while read-only, so the editor stopped receiving remote changes for the rest of the read-only session. It now keeps applying store updates and pushes the repair once the editor becomes editable.

One additional change: a background sync pass no longer mistakes the still-unpushed repair for the store having drifted and reverts it; the repaired content stays stable until the editor becomes editable and the repair pushes.

Another additional change: a handful of Behavior events (`select`, `mouse.click`, `clipboard.copy`, and the serialization events) still run their actions while read-only, so a custom Behavior that mutates on one of those is now protected the same way as any other unpushed edit, instead of being mistaken for a held repair and risking reversion by the background sync pass.

One more additional change: a store update applied while a read-only repair is still held now supersedes it instead of racing it. Previously the held repair could still flush after the newer update, pushing stale content (or, with `pushPatches`, a stale key) back over it.
