---
'@portabletext/editor': patch
---

fix: stop deduped `'selection'` events from falling through to the relay wildcard

`'selection'` events no longer re-fire with an unchanged selection while the editor syncs an external value update. Installs resolving `xstate` 5.32.2 or later hit this regression regardless of editor version; in Sanity Studio v5 it closed the annotation-editing popover on the first keystroke in one of its fields.
