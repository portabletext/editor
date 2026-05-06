---
"@portabletext/schema": minor
---

feat: add `getSubSchema` to derive the resolved sub-schema for a container's `of` declaration

Containers declare which types are allowed inside them via the `of` array on a child field. `getSubSchema(schema, of)` returns the resolved `Schema` view that applies inside such a container, so operations and validators that ask "what's allowed at this position?" can treat the result like any other top-level `Schema`.

The `{type: 'block'}` entry (if present) supplies the resolved styles, decorators, annotations, lists, and inlineObjects. Non-block `of` members become the schema's block objects.
