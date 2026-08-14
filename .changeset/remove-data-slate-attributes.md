---
'@portabletext/editor': major
---

feat!: remove the `data-slate-*` DOM attribute aliases

The editor DOM no longer carries the Slate-era `data-slate-*` attributes; it speaks `data-pt-*` only. CSS selectors and DOM queries keyed on the old attributes must migrate:

- `data-slate-editor` → `data-pt-editor`
- `data-slate-node="element"` → `data-pt-path` (every rendered node carries it; blocks also carry `data-pt-block`)
- `data-slate-node="text"` → `data-pt-inline="span"`
- `data-slate-leaf` → `data-pt-marks`
- `data-slate-string` → `data-pt-text`
- `data-slate-zero-width` → `data-pt-zero-width` (line-break variant: `data-pt-line-break`)
- `data-slate-void` → `data-pt-block="object"` / `data-pt-inline="object"`
- `data-slate-spacer` → `data-pt-spacer`

One behavioral consequence rides along: a node registered via `registerNode` (for example `defineInlineObject` or `defineSpan`) now receives the same clean `data-pt-*` attributes whether its parent text block renders through the legacy pipeline or the new one; previously the legacy pipeline mixed `data-slate-*` into the attributes passed to the registered render.
