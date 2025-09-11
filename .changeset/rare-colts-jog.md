---
'@portabletext/editor': patch
---

fix: improve history stack heuristics

Sending custom Behavior events will now create distinct steps in the history stack:

```ts
// Creates one step in the history stack
editor.send({type: 'custom.insert block', text: 'foo'})
// Creates another step in the history stack
editor.send({type: 'custom.insert block', text: 'bar'})
```
