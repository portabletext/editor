---
'@portabletext/steps': minor
---

feat: add `rangeSurvives`

Use `rangeSurvives(base, steps, range)` to determine whether at least one
original UTF-16 code unit in a range survives a transaction. Inserted
replacement text does not count as survival, and ranges may cross spans or
blocks.

```ts
import {rangeSurvives} from '@portabletext/steps'

const survives = rangeSurvives(value, steps, range)
```
