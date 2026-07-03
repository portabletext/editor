---
'@portabletext/editor': minor
---

feat: address `serialize` events with `at` and `fragment`

`serialize` and `serialize.data` gain two optional fields naming the serialization subject: `at` serializes a different range of the document (the same addressing convention as the other synthetic events), and `fragment` serializes different content entirely, with the range defaulting to the fragment's full span. A behavior can re-raise a serialize event with a corrected subject and let the rest of the pipeline, including custom converters, handle it:

```ts
defineBehavior({
  on: 'serialize',
  guard: ({snapshot, event}) => {
    if (event.fragment) {
      return false
    }
    const table = sliceToRectangle(snapshot)
    return table ? {fragment: [table]} : false
  },
  actions: [({event}, {fragment}) => [raise({...event, fragment})]],
})
```

Converters are unchanged: the subject is resolved into the snapshot they receive, so they keep reading `snapshot.context.value` and `snapshot.context.selection` as before.
