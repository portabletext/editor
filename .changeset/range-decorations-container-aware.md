---
"@portabletext/editor": patch
---

fix: render collapsed range decorations inside editable containers

The collapsed-range branch in `range-decorations-machine.ts` matched a decoration's anchor block to the iterating node by reading `path.at(0)` (root-level segment) and `path.at(2)` (root-level child). When the decoration's anchor pointed inside a callout or other editable container, the comparison failed and the decoration never rendered. Resolves the enclosing block via `getEnclosingBlock` and reads the child segment from the path tail so collapsed range decorations work at any depth.
