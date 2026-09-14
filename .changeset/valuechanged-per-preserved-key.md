---
'@portabletext/markdown': minor
---

feat: report `valueChanged` per preserved key in `onReconciliation`

Each `preservedKeys` entry now carries a `valueChanged` boolean alongside `basis`, `key`, and `path`: whether the node wearing that key in the returned value differs from its stored counterpart, field order aside but array order significant. Any difference counts, including a descendant key rewritten to keep siblings unique, or a key filled in for a stored node that had none. `false` guarantees the returned node deep-equals the stored one:

```ts
const changed = report.preservedKeys.filter((entry) => entry.valueChanged)
// keys whose returned node differs from its stored counterpart
```
