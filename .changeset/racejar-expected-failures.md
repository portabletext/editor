---
'racejar': minor
---

feat: select expected failures with compiled row predicates

`compileFeature` and the Vitest, Jest and Playwright `Feature` drivers accept an `expectFail` predicate over each compiled row's `name`, inherited `tags` and `examples`. `Scenario` is exported from `racejar` as the predicate's input type. Marked rows must fail, so a repaired row fails the test until its expectation is removed. A predicate that matches no rows throws during collection.

```ts
Feature({
  featureText,
  stepDefinitions,
  expectFail: (scenario) => scenario.examples?.['value'] === 'bar',
})
```

Jest runs a marked row's hooks inside the test, because a throwing Jest hook fails a `test.failing` test instead of counting as its expected failure.
Playwright marks the row with `test.fail`. It uses `test.fail.only` for a row tagged `@only`.
A marked row that fails in a `Before` hook, a step or an `After` hook counts as the expected failure.
