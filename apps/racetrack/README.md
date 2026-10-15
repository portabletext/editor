# Racetrack

Racetrack runs a Gherkin scenario against a real Portable Text Editor in a real browser and writes down what the editor did as JSON. The same run can serve as a bug repro, as evidence for a pull request, and, once a fix lands, as the start of a regression test.

It runs on the editor's own test stack: the scenario compiles with `racejar` and the shared step definitions from `packages/editor/src/test/vitest/`, and runs as a throwaway vitest browser test with the Playwright provider. Typing and key presses are real Playwright input, so they go through the browser's `beforeinput` pipeline.

## Commands

Run from the repository root:

```sh
pnpm racetrack run <file.feature> [--browser chromium|firefox|webkit] [--json] [--out <path>] [--step-timeout <ms>] [--verbose]
pnpm racetrack steps [--json]
```

`run` executes every scenario in the feature file and writes an evidence bundle. The browser is Chromium unless `--browser` says otherwise. The bundle goes to `apps/racetrack/.runs/<timestamp>-<run id>-<feature>.json` unless `--out` names a path. The run id is random and the file is created exclusively, so concurrent runs never write to the same file. A file that `--out` names is overwritten. `--json` also prints the bundle to stdout. The exit code is 0 when the bundle's `passed` is true and 1 otherwise. vitest's own output goes to stderr when the run produced no result, or always with `--verbose`.

A run that cannot start, such as one with a missing feature file, still produces a bundle: `results` is empty and `error` says why. A bundle that cannot be written fails the run. `--json` then prints it with the write error in `error`, and the summary says `Evidence not written`.

`pnpm` prints its own script banner to stdout. Use `pnpm -s racetrack run ... --json` when another program reads stdout, or read the file that `--out` names.

`steps` prints every step a scenario can use, with the parameter types and the regular expressions they match. The list is read from the step definitions each time, so it cannot drift from them. Steps marked `(+ doc string)` read a doc string placed under the step, and steps marked `(+ data table)` read a data table. A step works only with the kind it names.

## Writing a scenario

Every step must match exactly one step pattern. Otherwise no step runs and the bundle's `error` names the step that did not match. Check `pnpm racetrack steps` first.

Each scenario starts without editors, even in a file with several scenarios. A scenario that does not create its own editors fails at its first step that uses one.

Racetrack does not support the `@skip` and `@only` tags. A feature file that uses either fails to compile, with an `error` naming the tagged scenarios. Put only the scenarios you want to run in the file.

Steps without "in Editor B" act on Editor A. In a two-editor scenario, focus Editor B with `When Editor B is focused` before you type or press keys in it, as the core specs do.

Racetrack adds one step of its own:

```gherkin
Then capture the state
```

It records a checkpoint of every editor. It is not an assertion. A scenario needs at least one real `Then` step to pass.

The examples in `examples/` show one scenario with a single editor and one with two editors:

```sh
pnpm racetrack run apps/racetrack/examples/typing.feature
pnpm racetrack run apps/racetrack/examples/two-editors.feature
```

## The evidence bundle

The top level describes the run:

| Field             | Meaning                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `car`             | The setup the scenario ran on. Always `core` for now.                                                                                                                     |
| `browser`         | `chromium`, `firefox`, or `webkit`.                                                                                                                                       |
| `commit`          | Short SHA of `HEAD`. Uncommitted changes are not reflected.                                                                                                               |
| `feature`         | Path of the feature file.                                                                                                                                                 |
| `scenarios`       | Names of the scenarios that reported a result.                                                                                                                            |
| `startedAt`       | ISO timestamp.                                                                                                                                                            |
| `durationMs`      | Wall time of the whole run, browser start included.                                                                                                                       |
| `completed`       | Every step of every scenario ran, and the page raised no unhandled error.                                                                                                 |
| `assertionCount`  | Sum over all scenarios.                                                                                                                                                   |
| `passed`          | Every scenario passed, and the page raised no unhandled error.                                                                                                            |
| `failedStep`      | The first failed step, when one failed.                                                                                                                                   |
| `error`           | One line or block per problem: why the run produced no result (such as a compile error), the first scenario error, and each unhandled error, prefixed `Unhandled error:`. |
| `warnings`        | All scenario warnings, prefixed with the scenario name when there are several.                                                                                            |
| `unhandledErrors` | Errors the page raised outside any step, as vitest reports them.                                                                                                          |
| `results`         | One entry per scenario. A scenario outline gives one entry per example row.                                                                                               |

When a module fails to load, the browser only reports `Failed to import test file`. `error` then adds the `Caused by:` chain and Vite's own error lines, prefixed `Vite:`, which name the import that failed.

Each entry in `results` has `scenario`, `startedAt`, `durationMs`, `completed`, `assertionCount`, `passed`, `failedStep`, `error`, `warnings`, `checkpoints`, `events`, and `console`. Two more fields appear only when they apply: `notRun` gives the reason a scenario did not run (see the timeout below), and `captureError` gives the reason the failure checkpoint could not be taken. A failed capture never replaces the failure: `failedStep`, `error`, the events, and the console are kept.

`completed` means every step ran without failing. `assertionCount` counts the `Then` steps that ran, not counting `capture the state`. `passed` requires both, plus at least one assertion: a run that asserts nothing proves nothing, so it fails with the warning `no assertions`.

A step that ran through `{string} is typed` or `{string} is typed in Editor B` and emitted no `operation` event gets a warning too. It does not fail the run. See the limits below.

### Checkpoints

A checkpoint is taken at every `Then capture the state`, and once more at a failing step. `reason` is `capture` or `failure`. `after` is the label of the step the state follows: the step before `capture the state`, or the failed step itself. `editors` has an entry for `A`, and for `B` in two-editor scenarios, with:

- `textspec`: the editor state in textspec notation, selection included
- `value`: the full Portable Text value
- `selection`: the editor's selection
- `domSelection`: the browser selection when both ends are inside this editor, otherwise `null`. `anchor` and `focus` each have a `path` of elements from the editor root down to the node (tag, child index, and the editor's `data-pt-path`, `data-pt-block`, `data-pt-inline`, `data-pt-marks`, `data-pt-text`, `data-pt-zero-width`, `data-pt-line-break`, and `data-pt-spacer` markers) and an `offset`. `text` is the selected text.

Before a checkpoint, Racetrack waits for the preceding step to finish and then for two animation frames, so the selection validation pass has run. It never waits for a `mutation` event or any flush. Typing is batched into mutations on a debounce, and forcing a flush between steps would hide batching bugs that no user would avoid. A `mutation` event can therefore land in a later step than the typing that caused it.

Capture only reads public editor state. It never runs a textspec parser, because those consume the editor's key generator and would shift the keys of later edits.

### Events

`events` is everything the editors emitted through `editor.on('*')`, in order. Each event has `t` (milliseconds since the scenario started), `step` (the index of the step that was running, counting from 0 at the first step, so setup steps like `Given two editors` are step 0), `editor` (`A` or `B`), `type`, and the event's own fields:

- `operation`: `origin` (`local` or `remote`) and `operation`. This is the main stream. Patches are held back while the editor is read-only, and remote changes normalize without patching, so some repairs show up only here.
- `patch`: `patch`
- `mutation`: `patches` only. The value lives in checkpoints.
- `selection`: `selection`
- `focused`, `blurred`, `ready`, `editable`, `read only`, `value changed`, `invalid value`: their fields, without the DOM focus event

Functions, maps, sets, and DOM nodes are dropped from payloads.

The recorder subscribes to each editor when the step creates it, before the editor starts, so `ready` and every other startup event land at the creating step.

A step with no events after it is worth a second look. See the limits below.

### Console

`console` holds every `console.error` and `console.warn` call in the page during the scenario, plus uncaught errors and unhandled promise rejections. Each entry has `t`, `step`, `level`, and `message`.

## Inherited limits

Racetrack uses the shared step definitions as they are, including their quirks:

- Button steps sleep for 100ms.
- `{string} is typed` does nothing when the editor has no selection. This works around a WebKit difference, but it means a typing step can complete without typing. Racetrack warns when a typing step emitted no `operation` events.

Fixing either is a change to the step definitions, not to Racetrack.

The core test suite retries Firefox tests three times. Racetrack does not retry, so a flaky Firefox scenario can fail here where the core suite passes.

A step that runs longer than 20 seconds, or the milliseconds `--step-timeout` gives, fails with a timeout. Racetrack stops waiting for the step but cannot stop it, so it may still be acting on the page. The scenarios after it therefore do not run: each gets a result with `notRun` and `error` naming the step that timed out.

## From a passing scenario to a core spec

Once a scenario reproduces a bug and the fix makes it pass, turn it into a regression test:

1. Remove the `Then capture the state` steps. The core suite does not know that step.
2. Copy the scenario into a feature file in `packages/editor/gherkin-spec/`, either an existing one that covers the same area or a new `<name>.feature`.
3. For a new file, add `packages/editor/gherkin-tests/<name>.test.ts`, wired like the existing ones:

   ```ts
   import {Feature} from 'racejar/vitest'
   import nameFeature from '../gherkin-spec/<name>.feature?raw'
   import {parameterTypes} from '../src/test'
   import {stepDefinitions} from '../src/test/vitest'

   Feature({
     featureText: nameFeature,
     stepDefinitions,
     parameterTypes,
   })
   ```

4. Run it in all three browsers from `packages/editor`: `pnpm test:browser gherkin-tests/<name>.test.ts`.

## Racetrack's own tests

`pnpm test:unit` in `apps/racetrack` covers the parts that need no browser: how results add up to a bundle, the JSON copy of event payloads, how step labels line up with the compiled feature, and the step catalogue. `pnpm test:browser:chromium` runs the feature files in `tests/features/` and the examples through the CLI in Chromium and checks the bundles and exit codes. `pnpm test` runs both.
