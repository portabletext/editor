---
'@portabletext/editor': patch
---

fix(behaviors): perform groups of raised or executed events without normalization

This is useful if one event depends on a previous event. For example, raising
`block.set` together with `insert.child` to add an annotation will happen
without the editor normalizing the unused markDef away between the two events.

```ts
defineBehavior({
  on: 'insert.span',
  guard: ({snapshot, event}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    const markDefs =
      event.annotations?.map((annotation) => ({
        _type: annotation.name,
        _key: snapshot.context.keyGenerator(),
        ...annotation.value,
      })) ?? []

    return {markDefs, focusTextBlock}
  },
  actions: [
    ({snapshot, event}, {markDefs, focusTextBlock}) => [
      ...(focusTextBlock
        ? [
            raise({
              type: 'block.set',
              at: focusTextBlock.path,
              props: {
                markDefs: [
                  ...(focusTextBlock.node.markDefs ?? []),
                  ...markDefs,
                ],
              },
            }),
          ]
        : []),
      raise({
        type: 'insert.child',
        child: {
          _type: snapshot.context.schema.span.name,
          text: event.text,
          marks: [
            ...(event.decorators ?? []),
            ...markDefs.map((markDef) => markDef._key),
          ],
        },
      }),
    ],
  ],
})
  ```
