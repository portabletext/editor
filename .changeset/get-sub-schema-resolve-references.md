---
'@portabletext/schema': patch
---

fix: resolve bare `of` references against the schema's block objects in `getSubSchema`

A container field's `of` can reference a type declared on the schema by bare name (`{type: 'list'}`), the shape recursive schemas require. `getSubSchema` previously resolved such a reference to a block object with no fields, so inserting or dropping one of these blocks inside a container stripped it to its `_type` and `_key`: a `list` nested inside a `list-item` lost its `kind` and `items`, an `image` dropped into a table cell lost its `src`. Referenced types now resolve to their declaration and keep their fields.
