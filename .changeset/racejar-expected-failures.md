---
'racejar': minor
---

feat: select expected failures with compiled row predicates

`Feature` and `compileFeature` accept `expectFail`, a predicate receiving a `Scenario` with `name`, inherited `tags` and `examples` (the example column values, or `undefined` for a plain scenario). Select individual outline rows without editing the feature file:

```ts
Feature({
  featureText,
  stepDefinitions,
  expectFail: (scenario) =>
    scenario.name === 'Inserting text' && scenario.examples?.['text'] === 'foo',
})
```

Selected rows must fail, including assertions in racejar `After` hooks; an unexpected pass fails the run. A supplied predicate matching no rows throws during collection. This checks the predicate as a whole; it cannot detect a stale branch if another branch still matches. Omit the option when no failures are expected. `@skip` takes precedence and `@only` retains its focus behavior. Jest runs marked `After` callbacks in the test body because its native expected-failure mechanism excludes `afterEach`. Playwright callbacks explicitly request its built-in fixtures.
