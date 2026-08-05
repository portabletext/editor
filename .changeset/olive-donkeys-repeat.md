---
'@portabletext/block-tools': patch
'@portabletext/editor': patch
'@portabletext/html': patch
'@portabletext/keyboard-shortcuts': patch
'@portabletext/markdown': patch
'@portabletext/patches': patch
'@portabletext/plugin-character-pair-decorator': patch
'@portabletext/plugin-dnd': patch
'@portabletext/plugin-emoji-picker': patch
'@portabletext/plugin-input-rule': patch
'@portabletext/plugin-list-index': patch
'@portabletext/plugin-markdown-shortcuts': patch
'@portabletext/plugin-one-line': patch
'@portabletext/plugin-paste-link': patch
'@portabletext/plugin-sdk-value': patch
'@portabletext/plugin-table': patch
'@portabletext/plugin-typeahead-picker': patch
'@portabletext/plugin-typography': patch
'@portabletext/sanity-bridge': patch
'@portabletext/schema': patch
'@portabletext/test': patch
'@portabletext/toolbar': patch
'racejar': patch
---

fix: publish export maps that resolve, and add a `module` entry point

`@sanity/pkg-utils` v12 reconciles `exports` with `publishConfig.exports` during
the build, so the published manifests no longer carry development-only
conditions that point outside the tarball.

`@portabletext/test` had no `publishConfig.exports`, so it published its
development `exports` map verbatim, `source` condition included. That condition
points at `./src/index.ts`, which `files: ["dist"]` never publishes, so any
resolver honouring `source` — bundlers and monorepo tooling configured for it —
resolved to a file the tarball does not contain. It now publishes a map that
points at `dist` only.

`@portabletext/editor` had the same problem in its `./test` and `./test/vitest`
entry points, where both `exports` and `publishConfig.exports` pointed at
`./src/test/…` against `files: ["lib"]`. Those entry points are built now and
resolve to `lib`.

Every package also gains a `module` field next to `main`, which bundlers that
predate `exports` use to pick the ESM build.
