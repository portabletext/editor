---
'racejar': major
---

feat!: require vitest 5

The `vitest` peer dependency moves from `^4.1.11` to `^5.0.4`. Projects that run `racejar` with Vitest need Vitest 5.

Vitest 5 lists tests by parsing files statically, so `vitest list` finds no tests in a file that uses `racejar` and returns an empty listing when such a file is in scope. Run `vitest list --no-static-parse` to list Gherkin tests. `vitest run` and watch mode are not affected.
