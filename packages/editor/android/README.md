# Android device tests

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with. The typing, its retries and its time bounds come from `thumbjar`, see `packages/thumbjar/README.md`.

`vitest.config.ts` excludes `android/` from the editor's normal Vitest projects, and the tests run through their own config, `vitest.android.config.ts`. `test:unit` separately runs `test:android:unit`, the suite that checks `tests/ja.test.ts` against fake typing results, and never any device work.

## What runs in CI

The workflow `.github/workflows/android-ime.yml` boots an API 36 emulator with the Play Store image and runs two jobs:

1. `ja`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `en`: plain English typing, where Gboard commits each letter as it goes.

Each language has a test file in `tests/`, `tests/ja.test.ts` and `tests/en.test.ts`, with three tests each:

1. A plain `contenteditable` with no editor, `plain.html`, as the control.
2. The editor with one empty block, `editor.html`.
3. The editor with one block that already holds `x`, `editor.html?prefix=x`.

`tests/en-textarea.test.ts` types `kyou` twice on English Gboard into a plain `textarea`, `textarea.html`, and expects `Kyou kyou `. It is a control for `textarea` support in thumbjar, and CI never runs it, since `run-on-device.sh` only runs `tests/$IME_LANG.test.ts`. Run it against a prepared device with `pnpm test:android --run tests/en-textarea.test.ts`.

It runs on pull requests that touch the editor's input handling, this directory or `packages/thumbjar`, every night against `main`, and on demand.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

## Reading a run

A job goes red when the emulator never booted, a device prep step failed, or a test failed, including a test whose editor assertion did not hold. The workflow is not a required check, so a red job blocks no merge. Read the log to tell the three apart:

1. A `PREP FAILED: <step>` line means the device was never ready and no test ran. `phases.log` and, for Japanese, `ja-setup.log` show where it stopped.
2. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual values, and the `github-actions` reporter annotates the test file and writes the job summary. A driver fault the driver retried prints a `Driver fault in <test>` line.

Each job uploads an `android-ime-<lang>-api36-<attempt>` artifact with `vitest.log`, `phases.log`, `logcat.txt`, `diagnose.txt` and thumbjar's per-test artifacts: the page's state after each word as `<lang>-<test>.json`, screenshots and Gboard accessibility dumps.

### Time budget

thumbjar bounds one `typeOnDevice` call at 535 seconds and its device prep at 610. The workflow's `timeout-minutes` cap the steps around them, and work inside the emulator runner action, its SDK checks, AVD creation and shutdown, is bounded only by its step's cap:

1. `run-on-device.sh` runs each stage under `timeout -k`: reading the test stage's cap, `DEVICE_TEST_FILE_SECONDS` from `thumbjar/vitest`, in 15 seconds, and `thumbjar prepare`, readiness check included, in 610. The test file runs under that cap, 1825 seconds: its three tests of 575 each, 40 for the global setup, 30 for its device check, 5 to stop that adb and 5 for the page check, and 60 for Vitest's own start and exit, so a test that times out last still leaves thumbjar's setup file room to fail the file. With its 10 seconds to stop, the tests take at most 1835 seconds and the diagnostics after them 65, so the script ends within 2525 seconds, under 43 minutes. A unit test, `scripts/budget.test.ts`, fails when a device test file declares more than three tests or the script stops reading its cap from thumbjar.
2. Each run step allows 52 minutes: the emulator boot is capped at 6 by `emulator-boot-timeout` and the script at 43, which leaves about 3 for the emulator runner's SDK checks, AVD creation and shutdown. That is an allowance, not a timer of its own. If they take longer, the step's cap cancels the step. The packages download beforehand in their own 8-minute step, so the runner's own install only checks them.
3. Every step has a `timeout-minutes`. The job allows 153 minutes, the sum of the step caps on the path where the first run never boots and the retry runs in full: 39 for setup, the SDK and the page build, 52 for each run, and 8 for the boot check, the result and the upload, 151 in all. A job without a boot retry ends within 99.

These are enforced caps, not expected times. A typical job takes about 10 minutes.

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
IME_LANG=ja android/run-on-device.sh
```

`run-on-device.sh` expects a freshly booted emulator. It runs from `packages/editor`, as the workflow does, serves `android/dist/` on port 8765, prepares the device with `thumbjar prepare`, runs the tests for `IME_LANG` and writes everything to `android/out/`.

Once a device is prepared and the server runs, run the tests again without the prep, from `packages/editor`:

```
pnpm exec thumbjar serve android/dist --port 8765 &
adb reverse tcp:8765 tcp:8765
pnpm test:android --run tests/ja.test.ts
```

`test:android` runs every test file in `tests/` unless given one. It fails at once when `adb` has no device or the page is not served. Run one file per prepared device, as CI does: `ja.test.ts` leaves Gboard on Japanese, and `en.test.ts` never switches it back.

Without an emulator, `pnpm test:android:unit` runs `tests/ja.test.ts` against fake typing results and checks the time budget, and `pnpm check:types` checks the tests.

## Adding a test

Add the test to the file for its language. It calls `typeOnDevice` from `thumbjar` with the page's `url`, the `keyboard`, the `prefix` the block holds and the `words` to type, and asserts on what it returns. thumbjar's README describes each option and result. For example, to check that Japanese composition after a full-width prefix commits without a restarted composition, typing `sakura` and committing 桜:

```ts
test('Scenario: Typing sakura after full-width text', async () => {
  const typed = await typeOnDevice({
    url: 'http://localhost:8765/editor.html',
    keyboard: 'ja',
    prefix: 'あ',
    words: [{letters: 'sakura', candidate: '桜'}],
  })

  expect(typed.text).toMatch(/^あ(桜|さくら)$/)
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1]})
})
```

When Gboard has not loaded a word's candidates yet, the driver commits it with Space as kana, so a Japanese test accepts the kana for each word as well as the candidate.

Then:

1. Run `pnpm --filter @portabletext/editor check:types`.
2. Run the workflow on your branch, or `test:android` against a local emulator, and check the new test's result.
3. If it fails on `main` because of a known bug, make it `test.fails` and describe the bug by its behavior in a comment inside the test.

Each test adds about a minute or two to its job. A page other than `plain.html`, `textarea.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a call to `recordInput` from `thumbjar/page`.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`: the device tests CI runs. `tests/en-textarea.test.ts`: the `textarea` control, run by hand.
2. `page/`: the test pages, built with Vite from the workspace editor by `pnpm build:android`.
3. `run-on-device.sh`: runs inside the booted emulator. It serves the pages, runs `thumbjar prepare` and the tests for `IME_LANG`, and records diagnostics after them.
4. `scripts/device-suites.test.ts` and `scripts/fixtures/`: run `tests/ja.test.ts` against fake typing results.
5. `scripts/budget.test.ts`: checks that each device test file stays within the tests the time budget allows for and that `run-on-device.sh` runs it under the budget's cap.
6. `../vitest.android.config.ts`: the `device` project from thumbjar's `deviceProject` and the `android-unit` project.
