---
'@portabletext/schema': minor
---

feat: split `OfDefinition` into block, inline-object, and reference forms

Inline object declarations in an array's `of` now use `type: 'object'` with a required `name`. References use just `type: '<typeName>'` with no fields. The block form (`type: 'block'`) is unchanged.

This aligns the inline-declaration shape with Sanity's convention, where `name` is identity and `type` is meta-kind.
