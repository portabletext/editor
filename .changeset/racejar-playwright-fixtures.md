---
'racejar': patch
---

fix: pass only the fixtures a Playwright `Feature` names to its tests and hooks

Playwright Features register and run again. The optional `test` property selects a Playwright test, including one with extended fixtures. The `fixtures` property names exactly the fixtures passed to scenarios and Before/After hooks. It defaults to `page` and `context` and accepts `[]` for Features that need no fixtures.

`PlaywrightContext` now defaults to `page` and `context`, and `PlaywrightFixtures` is exported from `racejar/playwright`. A step or hook that uses other fixtures names them in its context, for example `PlaywrightContext<Pick<PlaywrightFixtures<typeof test>, 'page' | 'greeting'>>`, and the Feature lists them in `fixtures`.

`Feature`'s first type parameter is now the type of `test`, so a call like `Feature<MyContext>({...})` no longer compiles. Annotate the step and hook contexts instead and let `Feature` infer its types.
