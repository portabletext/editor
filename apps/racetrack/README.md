# Racetrack (v0 POC)

Hosted playground and scenario-driven test runner for Portable Text Editor
plugins. The customer writes their plugin once, drops it into Racetrack,
authors scenarios visually, and watches them go green. The same `.feature`
file runs here AND in the customer's vitest CI, with identical results.

This v0 POC is hard-coded to the mention-picker plugin and exists to
prove the loop end-to-end across three panels:

1. **Scenarios** (left): the `.feature` file rendered with a status dot
   per step.
2. **Playground** (centre): a live editor with the mention-picker plugin
   wired in for human exploration.
3. **Runner** (right): a "Run scenarios" button that spins up an isolated
   editor and drives it through every scenario, painting pass/fail
   results back into the left panel.

## How the shim works

Step definitions live in `@portabletext/editor/test/vitest` and import
from `vitest/browser` (for `userEvent`, `page`, `expect.element`) and
`vitest` (for `vi.waitFor`, `expect`, `assert`). Those are virtual
modules that vitest's runtime injects during browser tests.

Racetrack does not run inside vitest, so `vite.config.ts` aliases
`vitest/browser`, `vitest`, and `vitest-browser-react` to local shims
in `src/runner/`. The shims implement just enough surface to cover the
call sites in `step-definitions.tsx` and `test-editor.tsx`. Anything
not covered throws a loud error so missing coverage shows up
immediately rather than silently passing.

The same source code therefore runs in two contexts:

- in the customer's vitest CI, against the real `vitest/browser` runtime
- in Racetrack, against our shims that wrap `@testing-library/user-event`
  and a tiny `page` / `expect` polyfill

## Local dev

```
pnpm install
pnpm --filter racetrack dev
```
