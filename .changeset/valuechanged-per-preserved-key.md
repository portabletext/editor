---
'@portabletext/markdown': minor
---

feat: report `valueChanged` per preserved key in `onReconciliation`

Each `preservedKeys` entry now carries a `valueChanged` boolean alongside `basis`, `key`, and `path`: whether the node wearing that key in the returned value deep-equals its stored counterpart, identical fields and values with field order aside. `false` is a guarantee, since a node the edit did not touch always comes back as the verbatim stored value, so filtering `preservedKeys` for `valueChanged` finds exactly what an edit touched:

```ts
const touched = report.preservedKeys.filter((entry) => entry.valueChanged)
// keys whose stored value the edit actually changed
```
