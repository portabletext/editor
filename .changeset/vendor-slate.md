---
'@portabletext/editor': minor
---

feat: internalize Slate

The Slate framework (`slate`, `slate-dom`, and `slate-react`) is now vendored directly into the package source. This removes the external Slate dependencies entirely.

Why: Slate's public API constrains how we can evolve the editor's internal data model and operation handling. By owning the code, we can make targeted changes to normalization, node identity, and rendering without waiting for upstream changes or working around limitations.

This change comes with no public API changes and the editor's external behavior is unchanged as well.
