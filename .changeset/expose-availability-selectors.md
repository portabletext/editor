---
'@portabletext/editor': minor
---

feat: expose availability selectors for external plugins

Adds `getAvailableStyles`, `getAvailableLists`, `getAvailableDecorators`,
`isAvailableDecorator`, and `isAvailableList` (`@beta`). External plugins
can use these to gate behavior on what the focused block's sub-schema
allows rather than the root schema, so a plugin behavior won't fire
inside a container that disallows the action.
