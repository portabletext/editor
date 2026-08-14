---
'@portabletext/block-tools': minor
---

feat: re-export `createTableRule` from `@portabletext/html`

`@portabletext/block-tools/rules` already re-exports `createFlattenTableRule`; it now also re-exports `createTableRule`, `@portabletext/html`'s deserializer rule for converting `<table>` HTML into a nested table shape.
