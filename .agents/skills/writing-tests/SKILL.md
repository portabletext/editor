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

When scaffolding a new package, mirror `plugin-typeahead-picker`'s vitest config, not `plugin-sdk-value`.

## Harnesses

- **Editor integration tests**: `createTestEditor` from `@portabletext/editor/test/vitest` (inside the editor package: `../src/test/vitest`). Returns `{editor, locator}`. Plugins and probes go in as `children`, but note they mount as siblings _after_ `PortableTextEditable`; a provider that must wrap the editable needs a hand-rolled render with a comment explaining why.
- **Selector/pure-function tests**: `createTestSnapshot` (in the editor package: `test-utils/create-test-snapshot`; in plugins: duplicate it locally on public types, it is ~30 lines).
- **Keys**: always `createTestKeyGenerator` from `@portabletext/test`. It is deterministic (`k0`, `k1`, ...), which is what makes full-literal assertions possible. Generated keys may be asserted literally.

## Triggers

- Real user interaction via `userEvent` (`userEvent.type(locator, 'foo')`). Typing with no caret set lands at the block start.
- Everything else via `editor.send({type: ...})` with full payloads. This includes native-shaped events: `drag.dragover`, `drag.drop` etc. accept complete `position`/`dragOrigin`/`originEvent` objects, so no DOM event simulation is ever needed.
- Async settling via `vi.waitFor` around the assertion that proves the trigger landed. Debounced channels (the mutation batcher) need their own `vi.waitFor`; comparing them synchronously after another assertion passes is a race.
- **Never sleep** (`setTimeout`, arbitrary delays), even for negative asserts. To prove "nothing was emitted", create a deterministic flush point: perform a local edit through the same ordered channel and assert the full emission list contains exactly that edit's patches, a would-be echo would have to surface no later than the edit's own emission. This also upgrades the negative assert to a full-value pin.

## Assertion style: no indirection, full values

- Assert **complete literal values with `toEqual`**: the full value array, the full event array, the full operation objects. Deterministic keys make this possible. A full-value assertion pins ordering, count, and content at once, and drift shows up as a readable diff.
- Do **not** build summarizer helpers (string transcripts, custom matchers, mapping functions) between the collected data and the assertion. The reader should see exactly what the editor emitted.
- `expect.objectContaining` / `expect.any(String)` are last resorts for genuinely nondeterministic fields, used per-field, never to avoid writing out a value.
- For value-shape assertions where the full tree is noise, use `toTextspec(editor.getSnapshot().context)` and assert the textspec string (`'B: foo bar|'`), which is itself a full-value assertion in compact notation.
- Exact-sequence event tests (`EventListenerPlugin` collecting `EditorEmittedEvent`s) assert the whole sequence; do not filter event types out to make assertions easier.

## Structure

- `test('Scenario: ...')` naming for integration tests; plain `test(...)` with the function name for unit tests of a single function (`describe(buildIndexMaps.name, ...)`). Every integration test carries its own `Scenario:`; a `describe` may group by mechanism or function name but never carries the scenario, narration, or a comment preamble.
- Test files hold comments to the same bar as source files: the default is none. The scenario name and the full-value assertions are the documentation; narrative about why a contract exists belongs in the commit body, not in a comment above the test.
- A known-broken contract is pinned with `test.fails` asserting the desired behavior: it documents the bug executably, and the fix flips it to a plain `test` (CI reports it as unexpectedly passing until someone does).
- A quote character inside a test name is solved by switching the string's quotes (`"...set's fallout..."`), never with `\u` escapes or backslash-escaping. Prettier keeps whichever quote style avoids the escape.
- Tests first, helpers below (per repo AGENTS.md: helper functions below main functions).
- Fixtures are plain functions returning complete objects (`function block(key, text): PortableTextBlock`), local to the test file.
- Comments explain why, placed inside the scope they explain, not above it.
- When test code duplicates production logic from elsewhere (a copied helper in a plugin), port the source's test suite wholesale as the drift alarm, with a header comment naming the source and the keep-in-sync contract.

## Gates before pushing

From the package: `pnpm check:types`, `pnpm check:lint`, `pnpm check:react-compiler`, `pnpm test:unit`, `pnpm test:browser` (or `:chromium` while iterating), `pnpm build`. From the repo root: `pnpm check:knip`. The unit project fails on "no tests found": a package with only browser tests needs at least one `.test.ts`, which the drift-alarm suite usually provides.
