---
'racejar': patch
---

fix: make `hooks` optional in the Jest driver's `Feature`

The Jest `Feature` no longer requires a `hooks` array, matching the Vitest and Playwright drivers. A Jest test file can now call `Feature({featureText, stepDefinitions})` without passing `hooks: []` to satisfy the type checker.
