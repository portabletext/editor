---
'@portabletext/editor': patch
---

fix: rebuild the field on the next edit after a host-synthesized root `unset`

A host application can destroy the editor's whole field with a root `unset` the editor never emitted, by rewriting one of the editor's patches into a whole-field clear, for example. The editor kept showing its content while the stored document sat empty, and everything typed from then on was silently lost. The editor now recognizes such a wipe on the host's patch echo channel, warns in the console, and the next edit restores everything visible on screen. Echoes of the editor's own `unset`s are recognized and left alone: an ordinary clear does not warn and does not duplicate content.
