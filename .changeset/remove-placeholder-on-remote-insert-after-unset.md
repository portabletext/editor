---
'@portabletext/editor': patch
---

fix: remove the local placeholder on a remote root `insert` after a self-emitted `unset`

After clearing the field under a value-mirroring host, a collaborator's block arriving through `patches` no longer leaves an extra empty block in the editor; the editor shows only the collaborator's content.
