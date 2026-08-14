---
'@portabletext/html': minor
---

feat: add `createTableRule` for deserializing `<table>` HTML into a nested table shape

`createFlattenTableRule` was the only table deserializer, and it flattens a table into a list of standalone text blocks, losing the row/column structure. `createTableRule` keeps it: it turns a `<table>` into one block carrying `rows`, each row carrying `cells`, each cell carrying a Portable Text `value` array, the shape `@portabletext/plugin-table`'s `defineTable` produces.

```ts
import {htmlToPortableText} from '@portabletext/html'
import {createTableRule} from '@portabletext/html/rules'

const blocks = htmlToPortableText(html, {
  schema,
  rules: [createTableRule({schema})],
})
```

`headerRows` is set from leading `<thead>` rows or an all-`<th>` first row, and omitted when there are none. Ragged rows are padded to the widest row with empty cells, and `colspan`/`rowspan` are ignored: a spanning cell contributes one cell, and the padding fills the rest. The `containers` option matches a `defineTable` call whose container names were renamed. It is role-keyed like `defineTable`'s own option and reads only `type` and `arrayField`, so the same container definitions can be passed to both.
