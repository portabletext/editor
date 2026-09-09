---
'@portabletext/editor': patch
---

fix: remove the local placeholder on a remote root `insert` after a self-emitted `unset`

After clearing the field under a value-mirroring host, a collaborator's block arriving through `patches` no longer leaves an extra empty block in the editor; the editor shows only the collaborator's content. One additional change: an empty block that a host genuinely persisted in the window after the editor's own `unset` is now removed from the editor when a remote root `insert` arrives, until the next value sync restores it; distinguishing it from the editor's own placeholder takes provenance metadata, which is follow-up work.
