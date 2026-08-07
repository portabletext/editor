---
'@portabletext/editor': patch
---

fix: cancel net-zero insert/unset pairs when flushing mutations

Edits that create and discard content within one flush, such as a paste whose text merges into an existing span, previously emitted `mutation` events carrying the scratch work: keyed inserts followed by the unsets retracting them. Receivers applying those patches in slices could transiently render the discarded content, for example a remote paste briefly showing its text twice.

Emitted mutations now carry only the net change. Code observing `mutation` events sees fewer patches for such edits, and a mutation whose patches all cancel out is not emitted at all. Individual `patch` events are unchanged.
