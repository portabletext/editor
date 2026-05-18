---
'@portabletext/editor': patch
---

fix: route the editor on keyed paths internally

The editor's internal path representation switches from numeric paths (`[0, 1, 2]`) to keyed paths (`[{_key: 'k0'}, ...]`). Behaviors, selectors, traversal utilities, and the rendering pipeline now consume keyed paths directly instead of converting back and forth at boundaries.

Keyed paths are stable across sibling shifts: inserting a block at index 0 does not invalidate the references the renderer holds for blocks 1..N, so React's element memo short-circuits where it previously re-rendered every sibling. Patches over the wire keep their numeric form; the conversion happens once at the editor boundary.
