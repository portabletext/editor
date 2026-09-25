---
'@portabletext/editor': patch
---

fix: walk nested container registrations in `getUnionSchema`

`getUnionSchema` now includes the members declared by containers registered in another container's `of`, at any depth, such as the cells of a table registered with `defineTable`. Decorators, annotations, lists, styles, inline objects, and block objects that only a table cell declares now show up in `useToolbarSchema` from `@portabletext/toolbar`, and the built-in decorator shortcuts (for example `code`) now toggle those decorators inside the cell.

```ts
// The root allows `strong`, table cells allow `strong` and `code`
defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'table',
      // rows > cells > content:
      //   [{type: 'block', decorators: [{name: 'strong'}, {name: 'code'}]}]
    },
  ],
})

// With `table.Plugin` mounted
getUnionSchema(snapshot.context.schema, snapshot.context.containers)
  .decorators.map((decorator) => decorator.name)
// Before: ['strong']
// After: ['strong', 'code']
```
