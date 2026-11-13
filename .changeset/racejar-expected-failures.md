---
'racejar': minor
---

feat: select expected failures with compiled row predicates

`compileFeature` and the Vitest, Jest and Playwright `Feature` drivers accept an `expectFail` predicate over each compiled row's `name`, inherited `tags` and `examples`. Marked rows must fail, so a repaired row fails the test until its expectation is removed. A predicate that matches no rows throws during collection.

```ts
Feature({
  featureText,
  stepDefinitions,
  expectFail: (scenario) => scenario.examples?.['value'] === 'bar',
})
```

Jest includes racejar `After` hooks in the expected failure boundary for marked rows.
Playwright marks the row with `test.fail`.
A failing `After` hook on a marked row counts as the expected failure.
