---
'@portabletext/plugin-sdk-value': minor
---

feat: expose `convertPatches` from `@portabletext/plugin-sdk-value`

Lets consumers reuse the wire-shape to array-path patch conversion that the SDK value sync uses internally. Useful for any flow that sources value changes from outside the editor (e.g. a markdown source pane that round-trips into the editor via `@sanity/diff-patch`).
