---
"@portabletext/editor": patch
---

fix: validate inserts against the schema at the path

The editor enforces the schema as a contract for new data crossing into
documents. `insert.block` and `insert.child` now validate against the
schema that applies at the target path. Operations introducing types not
declared in that schema have no effect.

`child.set` with an unknown type also no longer logs an error; it noops.

Previously, validation was strict only inside containers and permissive
at the root — unknown decorators, annotations, and inline objects at the
root were silently accepted. That asymmetry was a mistake. The schema is
the contract for what's allowed where, applied uniformly to every write
boundary regardless of depth.

Existing document data is never modified by this enforcement. A document
with content authored under an older or different schema continues to
load and render unchanged. Schema validation is for new data crossing
into the editor, not for cleaning up data already there.
