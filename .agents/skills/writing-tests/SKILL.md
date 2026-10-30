---
name: writing-tests
description: How to write tests in the Portable Text Editor monorepo. Use whenever writing or editing tests in PTE packages. Covers test placement, harnesses, deterministic fixtures, and the house assertion style (no indirection, full values with toEqual).
---

# Writing PTE tests

## Test placement

**Before writing any test, find its existing home.** Always search for an established suite covering the domain (`ls tests/ | grep -i <topic>`, `rg -l <mechanism> tests/`) and read its scenario list before creating a file. The canonical suites are broad (`behavior-api.test.tsx` carries 30+ Behavior contract scenarios); a contract pin belongs next to its siblings, where reviewers and future failures will look for it. A new file is the exception, for a genuinely new domain, not the default. Also check whether the contract is already pinned in a different form before adding it at all.

The file extension is the discriminator, never a `.browser` suffix:

- `*.test.tsx` runs in the browser project (playwright: chromium, firefox, webkit)
- `*.test.ts` runs in the unit project (node)
- `*.test-d.ts` is type-level, using `expectTypeOf` from vitest
- `gherkin-tests/*.feature` + racejar for behavior specs (`Feature({featureText, stepDefinitions, parameterTypes})`)

When scaffolding a new package, mirror `plugin-sdk-value`'s vitest config: a `browser` project including `src/**/*.test.tsx` and a `unit` project including `src/**/*.test.ts`.

## Harnesses

- **Editor integration tests**: `createTestEditor` from `@portabletext/editor/test/vitest` (inside the editor package: `../src/test/vitest`). Returns `{editor, locator}`. Plugins and probes go in as `children`, but note they mount as siblings _after_ `PortableTextEditable`; a provider that must wrap the editable needs a hand-rolled render with a comment explaining why.
- **Selector/pure-function tests**: `createTestSnapshot` (in the editor package: `test-utils/create-test-snapshot`; in plugins: duplicate it locally on public types, it is ~30 lines).
- **Keys**: always `createTestKeyGenerator` from `@portabletext/test`. It is deterministic (`k0`, `k1`, ...), which is what makes full-literal assertions possible. Generated keys may be asserted literally.

## Triggers

- Real user interaction via `userEvent` (`userEvent.type(locator, 'foo')`). Typing with no caret set lands at the block start.
- Everything else via `editor.send({type: ...})` with full payloads. This includes native-shaped events: `drag.dragover`, `drag.drop` etc. accept complete `position`/`dragOrigin`/`originEvent` objects, so no DOM event simulation is needed to test a behavior.
- The exception is a test of the editable's own handling of a native event that `userEvent` cannot produce, such as a `beforeinput` input type keyboard input never fires. Set a real DOM selection and dispatch the real event on the editable (`new InputEvent('beforeinput', {inputType, bubbles: true, cancelable: true})`).
- Wait for content to render before focusing or selecting in it. A `focus` or `select` sent straight after inserting blocks can land before the DOM exists and fail silently.
- Async settling via `vi.waitFor` around the assertion that proves the trigger landed. Debounced channels (the mutation batcher) need their own `vi.waitFor`; comparing them synchronously after another assertion passes is a race.
- Every DOM query goes inside the retried callback. A `querySelector` run once before `vi.waitFor` is never re-run, so the wait checks the same stale element or `null` on every retry.
- A lone locator assertion is awaited directly: `await expect.element(locator).toBeVisible()`, not wrapped in `vi.waitFor`. `expect.element` already retries until its own timeout, and the wrapper cuts that to `vi.waitFor`'s 1s default. Pass a longer timeout to `expect.element` itself (`expect.element(locator, {timeout: 10_000})`).
- **Never sleep** (`setTimeout`, arbitrary delays), even for negative asserts. To prove "nothing was emitted", create a deterministic flush point: perform a local edit through the same ordered channel and assert the full emission list contains exactly that edit's patches, a would-be echo would have to surface no later than the edit's own emission. This also upgrades the negative assert to a full-value pin. The only exception is a wait with no observable signal to anchor on, such as a real IME sequence driven through CDP, and it carries a comment naming the missing signal.
- **Simulated races are event-driven, never clock-driven.** To reconstruct a stale-echo or interleaving scenario, capture the payload at one observable anchor (`vi.waitFor` on the emission that carries it) and deliver it after a later observable anchor (the subsequent flush landing in the collected events). Staleness is then a property of _which_ value arrives, independent of runner speed. A fixed-delay reconstruction is flaky by construction on slow runners, even when its premise check fails in the safe direction: the CI failure is honest but intermittent, which is still a broken test.
- To order async responses (a stale result arriving after a newer one), use promises the test resolves itself, then assert once the resolution is observable.
- A timer boundary (a debounce or throttle window) is the one thing to test on fake timers, with explicit `vi.advanceTimersByTime`. Never mix real waits and fake timers in one test, and note that `vi.waitFor` and `expect.poll` advance fake time while fake timers are on.
- Contract tests never assert on wall-clock duration or log timings. Pin complexity structurally (call counts, render counts) and keep any genuinely needed time ceiling in its own clearly named test.
- The timed tests in `packages/editor/tests/performance.test.tsx` are benchmarks. Each prints its duration with `console.warn` so whoever works on a feature, human or agent, can run the file and compare. The print is the point of those tests, so keep it, and never turn it into a duration assert. The `console.warn` summaries in `render-count-regression.test.tsx`, median commit time included, are the same kind of feedback and the one exception to the logging rule above. That suite's contract stays in its render-count asserts.

## Assertion style: no indirection, full values

- Assert **complete literal values with `toEqual`**: the full value array, the full event array, the full operation objects. Deterministic keys make this possible. A full-value assertion pins ordering, count, and content at once, and drift shows up as a readable diff.
- Do **not** build summarizer helpers (string transcripts, custom matchers, mapping functions) between the collected data and the assertion. The reader should see exactly what the editor emitted.
- `expect.objectContaining`, `expect.arrayContaining`, `expect.any`, `expect.anything`, `toMatchObject`, and `toBeDefined` are banned. The `pte/no-weak-value-assertions` lint rule fails on them in every test file.
- A field that looks variable is almost always a key. Build the editor with `createTestKeyGenerator` and assert the generated keys literally. Create the key generator and fixtures inside each test, so the keys a test sees never depend on which tests ran before it.
- `expect.stringContaining` and `expect.stringMatching` stay allowed for error and warning text, where the full message would couple the test to its wording.
- For value-shape assertions where the full tree is noise, use `toTextspec(editor.getSnapshot().context)` and assert the textspec string (`'B: foo bar|'`), which is itself a full-value assertion in compact notation.
- Exact-sequence event tests (`EventListenerPlugin` collecting `EditorEmittedEvent`s) assert the whole sequence; do not filter event types out to make assertions easier.
- Prefer the full emitted payload sequence over counting callback calls. Keep a call count only where the count is the contract, such as how many times a registration runs.

## Structure

- A scenario sets up exactly what its name says. A test named for an `[]` initial value that passes no `initialValue` is a copy of its `undefined` sibling.
- `test('Scenario: ...')` naming for integration tests. Every integration test carries its own `Scenario:`; a `describe` may group by mechanism but never carries the scenario, narration, or a comment preamble.
- Unit suites covering a single function group under `describe(fn.name, ...)` (for example `describe(buildIndexMaps.name, ...)`), tying the group to the symbol it pins and surviving renames. Every other `describe` and every test name is prose describing behavior. A quoted identifier string is the one banned form: `describe('isActiveListItem', ...)` goes stale on rename without gaining readability.
- Test files hold comments to the same bar as source files: the default is none. The scenario name and the full-value assertions are the documentation; narrative about why a contract exists belongs in the commit body, not in a comment above the test.
- A known-broken contract is pinned with `test.fails` asserting the desired behavior: it documents the bug executably, and the fix flips it to a plain `test` (CI reports it as unexpectedly passing until someone does). This holds when a new suite pins existing behavior too: where today's behavior is wrong, assert the right behavior under `test.fails` instead of pinning the bug as if it were the contract.
- No bare `test.skip`. Make the race deterministic, or pin a reproducible bug with `test.fails`.
- Reach code through the public or observable path. Do not test a private function only to cover an arm no caller reaches: an arm no caller reaches is dead code, not a test gap.
- A quote character inside a test name is solved by switching the string's quotes (`"...set's fallout..."`), never with `\u` escapes or backslash-escaping. Prettier keeps whichever quote style avoids the escape.
- Tests first, helpers below (per repo AGENTS.md: helper functions below main functions).
- Fixtures are plain functions returning complete objects (`function block(key, text): PortableTextBlock`), local to the test file.
- Comments explain why, placed inside the scope they explain, not above it.
- When test code duplicates production logic from elsewhere (a copied helper in a plugin), port the source's test suite wholesale as the drift alarm, with a header comment naming the source and the keep-in-sync contract.

## Changing existing tests

- Coverage never shrinks. Every test that ran before still runs, and every assertion is at least as strong. When a case is removed as a duplicate, name the test that still covers it.
- A test that claims to pin a mechanism must be shown red with that mechanism broken (a local edit, never committed). If it stays green, it does not pin the mechanism: report the gap instead of counting it as coverage.
- When replacing local fixtures with a shared helper, the built values must stay deep-equal. If the helper cannot produce the same value, keep the local fixture. Never change an assertion to fit a helper.

## Gates before pushing

From the package: `pnpm check:types`, `pnpm test:unit`, `pnpm test:browser` (or `:chromium` while iterating), `pnpm build`. From the repo root: `pnpm check:lint`, `pnpm check:knip`. The unit project fails on "no tests found": a package with only browser tests needs at least one `.test.ts`, which the drift-alarm suite usually provides.
