---
'@portabletext/editor': fix
---

fix: cross-parent range delete cleans up containers between start and end

Range delete that crosses container boundaries (e.g. select-all + Backspace
across a root text block, an editable container, and another text block) now
removes every container that's fully covered by the range and unwinds nested
structure on the start and end sides.

When the start or end of the range is the truly-first or truly-last point of
a container ancestor, the entire container is unset. Text blocks at the
range edges keep their shell so a Backspace at the top of a document still
leaves an editable placeholder behind.
