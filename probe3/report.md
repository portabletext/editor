# Probe 3

B1 is retained. B2 is preserved in its own commit, then removed from HEAD.
No emulator was available: device outcomes below are predictions for your CI run.
No feature files changed, no racejar code changed, and nothing was pushed.

## Commits

Commits use Christian Hamburger Grøngaard <christian.groengaard@sanity.io>, one package per commit and the requested hooks override.

| Commit                                   | Contents                                                            |
| ---------------------------------------- | ------------------------------------------------------------------- |
| b837c61b03ab8054ec19818593167bc583fc2646 | B1: thumbjar page steps, handlers, boundaries, retry tests, budgets |
| 0a60b4bc353ad1d82927983423d7a90a955c387c | B2: thumbjar stepwise session prototype and tests                   |
| 626e922e8                                | Remove B2; retain B1 for integration                                |
| 95fde22ce                                | Editor page, shared schema, collection definitions and Node tests   |
| 9a0817b63                                | CI matrix row and knip entry bookkeeping                            |
| 307623712                                | Verify real After-hook skip results and their reason                |

No changeset: thumbjar is private, and editor changes are test infrastructure.

## Inventory

226 scenarios/outline templates expand to 556 rows; 479 are fully drivable,
317 of those use Gboard. Route feasibility is broader than this probe's adapter:
only the two chosen features' page vocabulary is implemented here.

| Feature                                    | Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |
| ------------------------------------------ | -------------------: | ------------: | -------------: | ----------: |
| annotations-across-blocks.feature          |                   13 |            13 |             13 |          12 |
| annotations-collaboration.feature          |                    1 |             1 |              0 |           0 |
| annotations-edge-cases.feature             |                    4 |             4 |              4 |           4 |
| annotations-overlapping-decorators.feature |                   13 |            32 |             32 |          25 |
| annotations-overlapping.feature            |                    9 |            14 |             14 |           6 |
| annotations.feature                        |                   16 |            33 |             32 |          19 |
| block-objects.feature                      |                   12 |            15 |              4 |           4 |
| decorators-overlapping.feature             |                    4 |             4 |              4 |           0 |
| decorators.feature                         |                   21 |            50 |             40 |          33 |
| delete.feature                             |                   14 |            26 |              5 |           5 |
| inline-objects.feature                     |                    6 |             6 |              4 |           1 |
| insert.block.feature                       |                   24 |           208 |            208 |         133 |
| insert.blocks.feature                      |                    7 |            38 |             38 |          26 |
| insert.break.feature                       |                    5 |             9 |              8 |           8 |
| insert.child.feature                       |                    5 |             6 |              6 |           0 |
| insert.text.feature                        |                    1 |             4 |              4 |           4 |
| lists.feature                              |                   25 |            37 |             34 |          10 |
| paste.feature                              |                    3 |             6 |              0 |           0 |
| removing-blocks.feature                    |                    2 |             2 |              1 |           1 |
| selection-adjustment.feature               |                    3 |             3 |              0 |           0 |
| selection.feature                          |                    4 |             4 |              0 |           0 |
| splitting-blocks.feature                   |                   18 |            25 |             19 |          19 |
| undo-redo.feature                          |                   16 |            16 |              9 |           7 |

`node probe3/inventory.mjs` reproduces the counts and every used step text's
route in `probe3/inventory.md`. It compiles Gherkin Examples and Backgrounds,
extracts desktop Cucumber-expression patterns and parameter regexes, and reads
thumbjar's letter/symbol support. English compose supports a-z, hyphen, space;
Enter/Backspace support repetition. Clipboard, two editors, drag, other keys
and modifier/shortcut steps are excluded. Existing skip tags do not change
feasibility counts. Page includes editor actions, setup, and model assertions.

## Both APIs measured

| Measurement                                | B1                                 | B2 (additional to B1)                                       |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------------------- |
| Whole commit diff                          | 16 files, +246/-14                 | 9 files, +312/-6                                            |
| Full thumbjar suite                        | 279 passed                         | 280 passed                                                  |
| New fake-device cases                      | 2                                  | 3                                                           |
| Fault before Gboard                        | Restart fresh Chrome; replay case  | Restart; replay logged commands                             |
| Fault in user step 5 after input in step 2 | One attempt; inconclusive          | One attempt; pending command and close reject; inconclusive |
| Expectations on abandoned attempt          | None: assertions use final attempt | Already delivered assertions cannot be replayed             |

B1: `recordInput({getText, getState, actions})` registers named handlers;
`{type:'page', action:'select', args:{offset:2}}` awaits one handler over CDP.
Its boundary has the usual events, selection, focus, text and stateAfter.
CDP mutations use one evaluation, with awaitPromise; dropped replies never
repeat the mutation in the same document. Ordinary faults before input retry
only the whole case into proven fresh Chrome. Page exceptions never retry.
Page actions can introduce arbitrary digits, so cases with page steps omit
the final-text digit heuristic; keyboard-only cases retain it. Event-based
symbol classification remains. The existing classified-mistap retry exception
from thumbjar's Retries section remains; ordinary post-input faults never retry.

B2: `await openOnDevice(context, options)` opens a persistent driver run;
`session.type(text)`, `page(name,args)`, `read()`, `enter()`, `backspace()`
return boundary records, and `close()` awaits cleanup. An internal read occupies
record 1, so user step 5 is record 6. A command channel logs/replays actions
before input. Its third fake-device test proves author assertions run once
while page commands replay twice: replaying JavaScript requires a whole-case
callback, which would cease to be the proposed direct stepwise API.
Future unsupported input cannot be preflighted. Sessions suppress final-digit
classification and convert symbol mistaps to ordinary inconclusive faults,
preventing retries after already observed input boundaries. Abandoned sessions
are cancelled at test finish. Setup faults exhausted before input are faulted;
post-input faults are inconclusive; neither is an editor result. Summary counts
one driver run per scenario, not one result per method. A complete driver run
with a failed state assertion is an ordinary failed test.

Failure examples, verified locally:

- B1 driver: `page socket lost / Steps: / 1. page: done ... / 5. page: failed ...`.
- B2: the awaited fifth command rejects with that fault and all six records;
  earlier successful Then checks remain observations of an incomplete run.
- B1 After assertion: `Then the editor state is "B: foo|" (boundary 1): expected 'B: baz|' to deeply equal 'B: foo|'`.

A nested real Vitest run proves the After expectation fails its owning scenario
and receives its live test context. The message identifies the Then text and
boundary; the stack points at the TypeScript collector, not a .feature line.
B1 keeps the replay unit and assertion evidence aligned, so it is recommended
on semantics and readability, independent of implementation effort.

## Chosen rows and desktop evidence

`insert.break.feature` exercises page/Enter/page interleaving, inline objects,
selection and multiple checks around undo. `insert.text.feature` adds literal
Gboard composition replacing selections, with 100% drivable rows.
Desktop ran today's definitions in actual Chromium: 13 passed, 0 failed.
`probe3/desktop-results.json` preserves every row's result in feature order.

| Feature / expanded row                               | Desktop | Expected device (unverified) |
| ---------------------------------------------------- | ------- | ---------------------------- |
| insert.break: Breaking text block, before foo        | pass    | pass                         |
| insert.break: Breaking text block, after foo         | pass    | pass                         |
| insert.break: Breaking text block, after f           | pass    | pass                         |
| insert.break: Breaking second text block, before bar | pass    | pass                         |
| insert.break: Breaking second text block, after bar  | pass    | pass                         |
| insert.break: Breaking second text block, after b    | pass    | pass                         |
| insert.break: Breaking before inline object          | pass    | pass                         |
| insert.break: Enter with entire content selected     | pass    | pass                         |
| insert.break: Enter on a block object                | pass    | skip: ArrowRight unavailable |
| insert.text: expanded selection, row 1               | pass    | pass                         |
| insert.text: expanded selection, row 2               | pass    | pass                         |
| insert.text: expanded selection, row 3               | pass    | pass                         |
| insert.text: expanded selection, row 4               | pass    | pass                         |

Expected CI total: 12 pass, 1 skip. Native IME behavior is still unverified;
CI uses the unchanged desktop expectations, without Android-specific outcomes.

## Placement and focus

- thumbjar: generic JSON page steps, awaited handler dispatch and boundary records.
- `packages/editor/src/test/gherkin-schema.ts`: schema shared by desktop and page;
  the old desktop export is retained. Editor creation uses EditorProvider,
  PortableTextEditable and createTestKeyGenerator, as createTestEditor does.
- `packages/editor/android/page/gherkin.{html,tsx}`: real Chrome page;
  getState serializes `toTextspec(editor.getSnapshot().context)`.
  Given is a page action using fromTextspec, insert.blocks and textspec selection;
  initial content is not read from URL parameters. Actions await animation frames
  to let React render before subsequent selection/input.
- `android/scripts/gherkin.ts`: editor-specific collection and textspec assertions;
  Before clears the plan, steps collect, After runs one case and checks boundaries.
  Unsupported rows skip with reasons before calling the driver. Racejar supports
  tags but no runtime row filter; wildcard definitions permit collecting all rows
  without changing their feature text. Definition-specific editor logic stays here.
- `android/scripts/gherkin.test.ts` and `fixtures/suites/gherkin-after.ts`:
  fake-run collection, boundaries, and real Vitest After failure/skip checks.
- `android/tests/en.gherkin.test.ts`: loads both unchanged files via Feature;
  CI adds its `{lang: en, file: tests/en.gherkin.test.ts}` matrix row.
- `knip.json`: page entry; probe artifacts excluded from the production graph.

Source inspection: FOCUS_FIELD unconditionally collapses the DOM range to the
field's end. It would clobber a pre-focus caret. Here its initial tap precedes
all collected Given actions; chosen scenarios focus before placing their own
caret/selection. No caret is configured in the page before that tap.
The generated suite declares 13 tests for thumbjar's file budget; a Node test
compares it with Vitest's actual dynamic collection (static parsing sees zero).
Hook timeout now uses the same existing device-test budget as the test body.

## Exact validation commands

Commands ran at repository root with Node 24.22.1 and `TMPDIR=/workspace/tmp/thumbjar-racejar-probe`; logs are there.

| Command                                                                                                                                                                                                                             | Result                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm install`                                                                                                                                                                                                                      | pass                                                 |
| `node probe3/inventory.mjs`                                                                                                                                                                                                         | 23 features, 556 rows, no unmatched desktop patterns |
| `pnpm exec turbo build --filter='@portabletext/editor...'`                                                                                                                                                                          | 9 packages built/cached                              |
| `pnpm --filter thumbjar build`                                                                                                                                                                                                      | pass after retiring B2                               |
| `pnpm --filter thumbjar test:unit`                                                                                                                                                                                                  | B1: 279 pass; B2: 280 pass                           |
| `pnpm --filter thumbjar test:unit --maxWorkers=2`                                                                                                                                                                                   | final: 25 files, 279 pass                            |
| `pnpm --filter racejar test`                                                                                                                                                                                                        | 3 files, 5 pass                                      |
| `pnpm --filter @portabletext/editor test:android:unit`                                                                                                                                                                              | 3 files, 15 pass                                     |
| `pnpm --filter thumbjar check:types`                                                                                                                                                                                                | pass (also B2)                                       |
| `pnpm --filter racejar check:types`                                                                                                                                                                                                 | pass                                                 |
| `pnpm --filter @portabletext/editor check:types`                                                                                                                                                                                    | pass                                                 |
| `pnpm --filter @portabletext/editor build:android`                                                                                                                                                                                  | pass, including page type check                      |
| `PLAYWRIGHT_BROWSERS_PATH="$TMPDIR/browsers" pnpm exec playwright install chromium`                                                                                                                                                 | pass; preinstalled revision was too old              |
| `PLAYWRIGHT_BROWSERS_PATH="$TMPDIR/browsers" pnpm --filter @portabletext/editor test:browser:chromium gherkin-tests/insert.break.test.ts gherkin-tests/insert.text.test.ts --reporter=json --outputFile="$TMPDIR/desktop-raw.json"` | 13 pass                                              |
| `pnpm check:format`; `pnpm check:lint`; `pnpm check:knip`                                                                                                                                                                           | pass; knip emits existing configuration hints        |

Red checks: disabling B1 page execution fails `pnpm --filter thumbjar exec
vitest run src/driver.test.ts -t 'page actions share'`; clearing inputSent fails
that command with `-t 'stepwise session'`; reading final state for every Then
fails `pnpm --filter @portabletext/editor exec vitest run --config
vitest.android.config.ts --project android-unit scripts/gherkin.test.ts -t
'runs a scenario once'`. All temporary mutations were restored.
An unconstrained final thumbjar run hit an existing run/run.test.ts 5s timeout under concurrent build load; the two-worker rerun above passed.
The deliberate After failure fixture exits 1; its enclosing unit test asserts that failure and message. No local command used an emulator.
