# Android device tests

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with. The typing, its retries and its time bounds come from `thumbjar`, see [its README](https://github.com/portabletext/thumbjar#readme).

`vitest.config.ts` excludes `android/` from the editor's normal Vitest projects, and the tests run through their own config, `vitest.android.config.ts`. `test:unit` separately runs `test:android:unit`, the suite that checks `tests/ja.test.ts` against fake typing results, and never any device work.

## What runs in CI

The workflow `.github/workflows/android-ime.yml` runs one job per device test file in its matrix, each on its own freshly booted API 36 emulator with the Play Store image, prepared for the language in the file's row:

1. `tests/ja.test.ts`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `tests/en.test.ts`: plain English typing, where Gboard commits each letter as it goes.
3. `tests/ja.enter.test.ts` and `tests/en.enter.test.ts`: Enter in the editor on each keyboard, see below.
4. `tests/en.insert.break.test.ts` and `tests/en.insert.text.test.ts`: the existing `insert.break.feature` and `insert.text.feature` scenarios, one device test file per feature file, run through the page's actions with the editor's state read as textspec after each step. Known differences between the device and the feature are listed by scenario, boundary and the exact state the device produces in `en.insert.break.test.ts`, and any other state at those boundaries fails the file.

`tests/ja.test.ts` and `tests/en.test.ts` have three tests each:

1. A plain `contenteditable` with no editor, `plain.html`, as the control.
2. The editor with one empty block, `editor.html`.
3. The editor with one block that already holds `x`, `editor.html?prefix=x`.

The two Enter files have two tests each, as `runOnDevice` step lists on `editor.html`. One starts with `- ` in the block and taps Enter. The other starts empty, types `- ` on the symbol layout with a `compose` step whose `commit` is `none`, and then taps Enter. Each asserts the field's text, and each step's status, text, selection, focus and count of `insertParagraph` `beforeinput` events.

`tests/en-textarea.test.ts` types `kyou` twice on English Gboard into a plain `textarea`, `textarea.html`, and expects `Kyou kyou `. It is a control for `textarea` support in thumbjar, and CI never runs it, since the workflow's matrix has no row for it. Run it against a prepared device with `pnpm test:android --run tests/en-textarea.test.ts`.

Every pull request starts it. The emulator jobs run only when the pull request touches the editor's input handling, this directory or the editor's `package.json`, where the `thumbjar` version is set, and otherwise the `Android IME` check passes without them. It also runs every night against `main`, and on demand. Version Packages pull requests from this repository, whose head branch is `changeset-release/main` or `changeset-release/next`, skip the emulator and pass.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

## Reading a run

Each job runs its file through thumbjar's Android action, `portabletext/thumbjar/android@v1`, which pins the emulator, caches the system image, fetches the uiautomator2 server jar, retries once on a fresh emulator after an infrastructure failure and uploads the diagnostics. See [CI on GitHub Actions](https://github.com/portabletext/thumbjar/blob/main/docs/ci.md) for the retry, the cache and the step cap.

A job goes red when a device prep step failed, or a test failed, including a test whose editor assertion did not hold, or when the emulator never booted, adb lost the device or Gboard's Japanese dictionary never loaded on the retry too. A red job turns the `Android IME` check red, and the `main` ruleset requires that check, so the pull request cannot merge until a rerun passes.

1. A `PREP FAILED: <step>` line means the device was never ready and no test ran. `phases.log` and, for Japanese, `ja-setup.log` and `ja-dictionary.log` show where it stopped.
2. A failed run the action retried, or a failed retry, names its reason in the action's log. Say nothing about the editor from either.
3. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual
   values, and the `github-actions` reporter annotates the test file and writes the job summary. A
   driver fault the driver retried prints a `Driver fault in <test>` line. `runOnDevice` retries a fault before input once,
   and a classified mistap once even after input, after stopping the old Chrome and checking the new
   pid. A second mistap ends `inconclusive` with the
   mistap message. Other faults after input are not retried. Mistaps are unexpected digits absent
   from the inputs, or a symbol tap whose own `insertText` beforeinput reports a recorded long-press
   popup character. Symbol classification requires one event per tap, in order, so page text the
   editor rewrote never classifies as a symbol mistap. The per-file job summary counts every mistap
   retry the driver began and names its test.

Each job uploads an `android-ime-<file>-api36-<attempt>` artifact, `android-ime-ja-api36-1` for `tests/ja.test.ts`, with `timing.txt`, `vitest.log`, `phases.log`, `logcat.txt`, `diagnose.txt` and thumbjar's per-test artifacts: the page's state after each word as `<lang>-<test>.json`, screenshots and Gboard accessibility dumps.

English prep first types `hello` and Space into `editor.html`, opened with `thumbjar=english-warmup` added to its address, so Chrome and Gboard are past their first use before tests start. The page receives that input. A page that saves what it receives will save `Hello`. Prep accepts "Hello", ignoring case, with a space, a non-breaking space or nothing after it, then closes Chrome. Wrong text is retried. Prep fails after three attempts. Each outcome goes to `en-warmup.jsonl`, `en-warmup.log` and the GitHub step summary. The `en-warmup-<attempt>` artifacts keep the page's events and screenshots for each attempt. Count warm-up retries alongside first-test failures when re-measuring cold drops.

### Time budget

thumbjar bounds each `runOnDevice` call and the device prep. `thumbjar run` gives the cap read and device check 10 seconds with 5 to stop, the test stage `deviceTestFileSeconds` for the file's test count with 10 to stop, and the final diagnostics 60 seconds with 5 to stop. Node guards enforce the child deadlines with SIGTERM followed by SIGKILL even if the run process is killed. Prep enforces its own per-language deadline, and the server stops when its connection to the run process closes. The English warm-up gets 180 seconds plus 10 to stop. That makes English prep 822 seconds with its kill grace. Japanese prep stays at 889 seconds. The nine-test English insert-break row needs 124 minutes per run (7,382 seconds worst case), so its action step gets 258 minutes, two runs plus 10, and the job cap is 285 minutes with the steps before it. These are upper bounds, not measured warm-up durations.

The workflow's `timeout-minutes` are flat backstops, including for a hang inside the action.

## Running it

From the Actions tab, run the Android IME workflow on a branch with "Run workflow".

Locally, with an Android SDK, an API 36 `google_apis_playstore` x86_64 system image and Node 24:

```
pnpm install
pnpm exec turbo build --filter='@portabletext/editor...'
pnpm --filter @portabletext/editor build:android
pnpm --filter @portabletext/editor exec thumbjar fetch-u2-jar
emulator -avd <your API 36 Play Store AVD> -no-snapshot &
adb wait-for-device
cd packages/editor
pnpm exec thumbjar run tests/ja.test.ts --keyboard ja --page-dir android/dist --config vitest.android.config.ts --project device --out-dir android/out
```

The filtered fetch runs with `packages/editor` as its current working directory, so it uses `packages/editor/node_modules/.cache/thumbjar/u2.jar`.

`thumbjar run` expects a freshly booted emulator. It runs from `packages/editor`, serves `android/dist/` on port 8765, prepares the device for `--keyboard` with `thumbjar prepare`, runs the one test file it is given and writes everything to `android/out/`.

Once a device is prepared and the server runs, run the tests again without the prep, from `packages/editor`:

```
pnpm exec thumbjar serve android/dist --port 8765 &
adb reverse tcp:8765 tcp:8765
pnpm test:android --run tests/ja.test.ts
```

`test:android` runs every test file in `tests/` unless given one. It fails at once when `adb` has no device or the page is not served. Run one file per prepared device, as CI does: `ja.test.ts` leaves Gboard on Japanese, and `en.test.ts` never switches it back.

Without an emulator, `pnpm test:android:unit` runs `tests/ja.test.ts` against fake typing results and checks the time budget, and `pnpm check:types` checks the tests.

## Adding a test

Add the test to the file for its language. It calls `runOnDevice` from `thumbjar` with the test's `context` and the page's `url`, the `keyboard`, the `prefix` the block holds and the `steps` to drive, and asserts on what it returns. thumbjar's README describes each option and result. For example, to check that Japanese composition after a full-width prefix commits without a restarted composition, typing `sakura` and committing 桜:

```ts
test('Scenario: Typing sakura after full-width text', async (context) => {
  const run = await runOnDevice(context, {
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: 'あ',
    steps: [{type: 'compose', letters: 'sakura', commit: {candidate: '桜'}}],
  })

  expect(run.text).toEqual('あ桜')
  expect(
    run.steps.map(
      (step) =>
        step.events.filter((event) => event.type === 'compositionstart').length,
    ),
  ).toEqual([1])
})
```

A required candidate Gboard does not offer fails the step and rejects the call. Assert the exact converted text. Use `run.steps` for each step's events and `run.events` for the full event sequence; count nested compositions by tracking `compositionstart` and `compositionend` in order.

Then:

1. Run `pnpm --filter @portabletext/editor check:types`.
2. Run the workflow on your branch, or `test:android` against a local emulator, and check the new test's result.
3. If it fails on `main` because of a known bug, make it `test.fails` and describe the bug by its behavior in a comment inside the test.

Each test adds about a minute or two to its job and increases its file's test stage cap. A new test file needs its own row in the workflow's matrix. The row's `runMinutes` is the cap of one run, which must cover the runner setup, the boot wait, the cap read, the prep, the file's test stage, the device check and the diagnostics, each at its bound with the kill graces of its commands (`runStepWorstSeconds` in thumbjar). Its `actionMinutes` is two runs plus 10. `scripts/budget.test.ts` checks both for every row and that the job cap stays at or under 360 minutes. A page other than `plain.html`, `textarea.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a call to `recordInput` from `thumbjar/page`.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`, `tests/ja.enter.test.ts`, `tests/en.enter.test.ts`, `tests/en.insert.break.test.ts`, `tests/en.insert.text.test.ts`: the device tests CI runs. `tests/en-textarea.test.ts`: the `textarea` control, run by hand.
2. `page/`: the test pages, built with Vite from the workspace editor by `pnpm build:android`.
3. `thumbjar run`: runs inside the booted emulator. It serves the pages, runs `thumbjar prepare` for `--keyboard` and the test file it is given, checks for the device after a failed stage and records diagnostics after the tests.
4. `scripts/device-suites.test.ts` and `scripts/fixtures/`: run `tests/ja.test.ts` against fake typing results.
5. `scripts/budget.test.ts`: checks thumbjar's test count against the tests Vitest collects, and the workflow's matrix and caps.
6. `../vitest.android.config.ts`: the `device` project from thumbjar's `deviceProject` and the `android-unit` project.
