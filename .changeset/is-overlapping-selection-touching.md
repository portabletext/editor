---
'@portabletext/editor': patch
---

fix: treat touching selections as overlapping

Two selections that share a single point at one of their endpoints (collapsed-at-edge-of-expanded, expanded-touching-at-endpoint) are now considered overlapping for the purposes of `isOverlappingSelection`. The function is now a pure interval-overlap check. The drag-and-drop self-drop suppression that depended on the previous "touching is not overlapping" carve-out moved into the dnd behavior itself as a local helper, so the public selector's contract is consistent with mathematical overlap.
