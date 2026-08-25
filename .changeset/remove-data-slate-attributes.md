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

One behavioral consequence rides along: an inline object or span registered via `registerNode` (for example `defineInlineObject` or `defineSpan`) could receive `data-slate-*` attributes mixed into the `attributes` prop passed to its `render` function when its parent text block was not registered. Every registered inline render now receives the same clean `data-pt-*` attributes regardless of whether the parent text block is registered.
