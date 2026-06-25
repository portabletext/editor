---
'@portabletext/editor': patch
---

fix: gate span `data-child-*` on the pipeline, not container nesting

Spans rendered through the new pipeline (a `defineX` text-block registration, or any descendant of a container) no longer emit the legacy `data-child-key`/`data-child-name`/`data-child-type` attributes. Previously they appeared on top-level spans even when the text block was rendered through a catch-all registration, inconsistent with `data-slate-*`, which the new pipeline already omitted. Spans in the legacy pipeline (no `defineX` registration) are unchanged and still carry them.
