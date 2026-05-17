---
"@portabletext/editor": patch
---

refactor: tighten the `data-pt-*` DOM attribute namespace for v7

The `data-pt-*` attributes the editor renders have been audited and renamed in preparation for v7's freeze. The namespace is owned by the editor for its own DOM bridge and consumer-facing structural targets; consumer-shaped data goes through render callbacks, not the engine namespace.

- `data-pt-block-type` → `data-pt-block` (values `"text"` | `"object"` | `"container"`)
- `data-pt-child-type` → `data-pt-inline` (values `"span"` | `"object"`)
- `data-pt-mark` → `data-pt-marks` (matches the `marks` field name on a span)
- `data-pt-string` → `data-pt-text` (matches the Portable Text spec's "text" noun)
- `data-pt-zero-width="z"` / `data-pt-zero-width="n"` → `data-pt-zero-width` boolean + `data-pt-line-break` boolean (cryptic single-character values replaced by descriptive boolean attributes)

The naming rule going forward: `data-pt-X` is set when the element IS an X. Value is the kind discriminator when one exists; absent otherwise. `data-pt-path` remains the documented free-form data-carrier exception. Values use human-readable English words, never cryptic abbreviations.

Consumer CSS or DOM queries targeting the old names need to update to the new names.
