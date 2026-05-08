---
'@portabletext/editor': patch
---

fix: resolve registered containers at any nesting depth

Self-referential schemas (lists inside list-items inside lists, callouts inside lists, etc.) now render as containers at every depth in the data, not just the depths the resolver pre-emits during schema walk. Container lookup falls back to scope-pattern matching when the runtime type chain is deeper than the schema walk could enumerate.
