---
'racejar': minor
---

feat: select expected failures outside feature files

`Feature` and `compileFeature` accept `expectedFailures`, a list of scenario names. Matching scenarios must fail, including assertions in `After` hooks; an unexpected pass fails the run. Unknown names throw during collection. A name selects every matching outline row. `@skip` takes precedence and `@only` retains its focus behavior.

```ts
Feature({
  featureText,
  stepDefinitions,
  expectedFailures: ['Known device difference'],
})
```
