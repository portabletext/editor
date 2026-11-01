---
'racejar': patch
---

fix: mark the test runner peer dependencies as optional

Each entry point needs only its own test runner. `racejar/vitest` needs `vitest`, `racejar/jest` needs `@jest/globals` and `racejar/playwright` needs `@playwright/test`. Installing `racejar` no longer warns about the two runners you don't use, and package managers that install peers automatically no longer pull them in.
