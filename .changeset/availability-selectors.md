---
"@portabletext/editor": patch
---

fix: scope decorator, annotation, list, and style lookups to container sub-schema in behaviors

Behaviors that branch on what's available (decorators, annotations,
lists, styles) now consult the focused block's sub-schema rather than
the root schema. The new availability selectors (`getAvailableStyles`,
`getAvailableLists`, `getAvailableDecorators`, `isAvailableDecorator`,
`isAvailableList`) replace direct `editor.schema.X` reads inside
behaviors, so a container that disallows a list type, decorator, or
style stops triggering the behavior that would have produced it.
