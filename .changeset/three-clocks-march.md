---
'@portabletext/editor': patch
---

fix: `send` inside `effect` now has access to `focus`/`blur` events

```ts
defineBehavior({
  on: 'decorator.add',
  actions: [
    ({event}) => [
      forward(event),
      effect(({send}) => {
        send({type: 'blur'})
      }),
    ],
  ],
})
```
