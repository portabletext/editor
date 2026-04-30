---
'@portabletext/editor': patch
---

fix: cross-parent range delete also removes content between endpoints

A cross-parent range delete (one endpoint inside an editable container, the other outside, or both endpoints in different containers) used to only trim partial text at each endpoint. Anything between the two endpoints survived: trailing blocks in the start container, leading blocks in the end container, and fully-covered siblings at the lowest common ancestor of the two branches.

The cross-parent path now mirrors the same-parent cross-block path: it walks up from each endpoint's block to the branch root, dropping trailing or leading siblings at every level, drops blocks between the two branches at the LCA, then trims each endpoint's partial content. The two block shells stay in place, since they aren't siblings under a common parent and there's no cross-parent merge to perform.

Containers that the selection enters or exits keep their shells by construction. For containers fully covered at the LCA, the editor checks whether the LCA's field accepts text blocks. When it does (root, callout content, code-block lines), the covered container is dropped as a unit. When it doesn't (table rows hold only cells; table holds only rows), the container's shell is preserved and its content is cleared in place. The clear is recursive: a fully-covered row keeps its cells as shells with each cell's content replaced by a single empty text block.
