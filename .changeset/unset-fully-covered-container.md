---
'@portabletext/editor': patch
---

fix: unset structural containers fully covered by a delete range

When a delete range fully covers a structural container (a callout, a fact-box, a table), the container is now removed as a unit instead of having its content trimmed in place. The selection collapses to a single point at the start of the delete range, matching the behavior consumers expect from text-block ranges.
