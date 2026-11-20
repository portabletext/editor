---
name: naming-sanity
description: >-
  How to refer to Sanity in code, comments, tests, docs, changesets, commits
  and PR bodies in this repo. Use whenever text would mention the app that
  hosts the editor.
---

# Naming Sanity

The editor is a library. Its code and docs state the general need, never the
app that has it: "the host app", "a host that renders its own portal", not the
name of one product.

When a Sanity-specific thing has to be named, say "Sanity": "Sanity's comment
anchor format", "Sanity sets its font on `#sanity`".

Never write a bare "Studio" in source, comments, JSDoc, tests and test titles,
READMEs, docs, changesets, commit messages or PR bodies. Where a text is about
the product itself, as in a guide to developing the editor inside it or the
test bed in `apps/studio`, name it in full: "Sanity Studio".

Not covered:

- Names that contain the word: package names, import paths, URLs, quoted API
  identifiers, and script, folder, workflow, label and check names
  (`apps/studio`, `pnpm dev:test-studio`, `trigger: studio-e2e`).
- Changelog entries already released.
- Quotations of merged PR or issue text.
- The product copy guide in `.claude/skills/product-copy-assistant`, which
  covers Sanity's own docs, not this repo's code.
