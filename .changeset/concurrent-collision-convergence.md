---
'@portabletext/editor': patch
'@portabletext/plugin-sdk-value': patch
---

fix: converge concurrent editors on formatting, overlapping deletes, and emptied documents

Two editors that assembled the same content through different paths (local edits, remote patches, adopting a fetched document) could disagree forever without any visible difference, and concurrent link formatting could persist invalid Portable Text (a span mark with no matching `markDef`). Four fixes, all client-side:

- Nodes entering the engine are rebuilt with a canonical property order (`_type`, `_key`, then the rest alphabetically), so converged editors hold byte-identical values regardless of how each one got there.
- Adopting an empty document into an already-empty editor no longer re-mints placeholder keys, and clearing a non-empty editor empties the first text block in place instead of replacing it. An editor that emptied the document by deleting text keeps those keys, so every client converges on the same empty shape.
- markDefs housekeeping (pruning unused definitions, deduplicating, dropping annotations from empty spans) is cosmetic and now runs only as fallout of local edits, like span merging. Pruning on adoption deleted definitions that a collaborator's in-flight edits still referenced, which orphaned their marks at the document.
- The value-sync plugin keeps every pushed transaction self-consistent: a definition is never unset while the store, the editor, or the same flush still references it, a flush that references a definition the store lost re-inserts it, and a confirmed repair that finds a stranded annotation reference (a key that previously appeared in `markDefs` but no longer resolves) removes the mark at the document and locally. Marks that never appeared in `markDefs` are untouched, so decorators from schemas this editor doesn't know still survive.
