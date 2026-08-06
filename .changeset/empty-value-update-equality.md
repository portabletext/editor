---
'@portabletext/editor': patch
---

fix: treat `undefined` and `[]` as equal empty values in value sync

An `update value` event carrying an empty array no longer clears text the user has typed when the editor's last synced value was `undefined`. Both shapes mean "empty", so the update is now a no-op instead of counting as a remote change that wipes local content. This could surface as typed text suddenly disappearing in Sanity Studio when a stale document snapshot presented an empty field as `[]` after a dropped listener connection.

A genuine remote clear, where the previously synced value was non-empty, still empties the editor as before.
