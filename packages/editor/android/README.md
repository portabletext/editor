# Android device tests

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with. The typing, its retries and its time bounds come from `thumbjar`, see `packages/thumbjar/README.md`.

`vitest.config.ts` excludes `android/` from the editor's normal Vitest projects, and the tests run through their own config, `vitest.android.config.ts`. `test:unit` separately runs `test:android:unit`, the suite that checks `tests/ja.test.ts` against fake typing results, and never any device work.

## What runs in CI

The workflow `.github/workflows/android-ime.yml` runs one job per device test file in its matrix, each on its own freshly booted API 36 emulator with the Play Store image, prepared for the language in the file's row:

1. `tests/ja.test.ts`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `tests/en.test.ts`: plain English typing, where Gboard commits each letter as it goes.

Each file has three tests:

1. A plain `contenteditable` with no editor, `plain.html`, as the control.
2. The editor with one empty block, `editor.html`.
3. The editor with one block that already holds `x`, `editor.html?prefix=x`.

`tests/en-textarea.test.ts` types `kyou` twice on English Gboard into a plain `textarea`, `textarea.html`, and expects `Kyou kyou `. It is a control for `textarea` support in thumbjar, and CI never runs it, since the workflow's matrix has no row for it. Run it against a prepared device with `pnpm test:android --run tests/en-textarea.test.ts`.

It runs on pull requests that touch the editor's input handling, this directory or `packages/thumbjar`, every night against `main`, and on demand. It skips the Version Packages pull requests, whose head branch is `changeset-release/main` or `changeset-release/next`, which only bump versions and changelogs.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

## Reading a run

A job goes red when a device prep step failed, or a test failed, including a test whose editor assertion did not hold, or as an infrastructure failure when the SDK install failed twice, the emulator never booted, adb lost the device or Gboard's Japanese dictionary never loaded on the retry too. The workflow is not a required check, so a red job blocks no merge. The Result step's `run outcome` line, also in the job summary, says which:

1. `run outcome: the emulator install failed twice, infrastructure failure, not a test result` means SDK installation failed on both attempts, with an `INSTALL_RETRY` line naming the retry. No emulator run started, and Boot time prints nothing without `timing.txt`. A cancelled job with no `EMULATOR_START` line in `timing.txt`, including a missing file, reads `run outcome: cancelled`. Once an emulator run started, its run result retains any retry reason. If an earlier step failed before either install ran, the result reads `run outcome: no emulator run, a step before the emulator install failed`. A successful install retry prints `install outcome: retried once after a failed install` before the unchanged run result, in both the log and job summary.
2. `run outcome: device lost twice, infrastructure failure, not a test result`, or a line naming an emulator that never booted or Gboard's Japanese dictionary that never loaded, means the emulator failed on both runs. A line saying the run ended after boot without a completed device check means the last run stopped before its check could record a verdict. Say nothing about the editor from either.
3. A `PREP FAILED: <step>` line means the device was never ready and no test ran. The `run outcome` line quotes it after `the prep failed:`, for example when Gboard did not convert with its Japanese dictionary after the load. `phases.log` and, for Japanese, `ja-setup.log` and `ja-dictionary.log` show where it stopped.
4. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual values, and the `github-actions` reporter annotates the test file and writes the job summary. A driver fault the driver retried prints a `Driver fault in <test>` line.

Each job retries once, on a fresh emulator, when the first emulator never booted (a `BOOT_RETRY` line), when adb lost the device after boot, during prep or the tests (a `DEVICE_LOST_RETRY` line), or when Gboard's Japanese dictionary never loaded on a device the check found reachable (a `DICTIONARY_RETRY` line). The lines also go to the job summary, and the `run outcome` line names the retry. `thumbjar prepare` exits 3 for that dictionary and 1 for every other prep failure, and `run-on-device.sh` writes `PREP DICTIONARY_NOT_LOADED` to `timing.txt` for status 3 only, so the retry never reads the prep's reason. Any other failure on a device adb still reaches is never retried, whether a test, another prep step, the dictionary check after the load or a driver fault failed. A dictionary that never loaded on the first run, then a run that could not retry, quotes the prep's reason like any other prep failure. After a prep or test stage fails, `run-on-device.sh` reads `adb get-state` once, with its stdout apart from its stderr, where adb prints its daemon start-up lines, and writes its verdict to `timing.txt` as one line before anything else: `CHECKED device` when stdout is `device`, and `CHECKED lost` when stdout is `offline` or adb fails with `error: device offline`, the answer of a dead emulator, or reports no such device (`no devices/emulators found`, `device '<serial>' not found`). Anything else proves nothing and gets no verdict: a device that is `unauthorized`, in `bootloader` or `recovery` or in another state is still there, any other adb error says nothing about the device, and an `adb get-state` that does not answer within 5 seconds may only be a slow adb server. A retry on a reachable device could turn a real test failure into a passing retry. The read runs once the stage has ended, so it never changes a test's outcome. A run that needed no check writes `CHECKED skipped`. A lost verdict is retried whatever stops the run after it. A run that ended after boot without a verdict, because the step's `timeout-minutes` or the check's own timeout stopped it first or `adb get-state` proved nothing, is never retried. Its result reads `run outcome: the run ended after boot without a completed device check, not a test result`. A cancelled run reads `run outcome: cancelled`. `scripts/emulator-runs.mjs` decides the retry and the result from `timing.txt`, and the Boot time step prints each run's boot as `BOOT_SECONDS run <n>: <seconds>`.

Each job uploads an `android-ime-<file>-api36-<attempt>` artifact, `android-ime-ja-api36-1` for `tests/ja.test.ts`, with `vitest.log`, `phases.log`, `logcat.txt`, `diagnose.txt` and thumbjar's per-test artifacts: the page's state after each word as `<lang>-<test>.json`, screenshots and Gboard accessibility dumps.

The emulator and the `google_apis_playstore` x86_64 system image come from the actions cache when it holds the versions a fresh install picks. The runner image ships platform-tools and the platform, so they are not cached. The cache key names the runner OS, the API level, the image, and the image revision and emulator version that `sdkmanager --list` reports as available at the lookup, which takes about 3 seconds. A lookup that fails, or an SDK that already has one of the two packages, skips the cache. `sdkmanager --install` never upgrades or repairs an installed package, it only checks that its directory exists, so every save carries a manifest with the cache's key and each file in the two packages with its size. A file name with a tab, a newline or a carriage return fails the manifest, and nothing is saved. After a restore, `scripts/emulator-runs.mjs cache-check` deletes both packages when the manifest names another key, and a package that has a file missing, a file added or a file of another size, or that the manifest does not list, and the install downloads it as on a miss. A check that fails or times out deletes both packages. Only runs on `main` save, the nightly schedule and a manual dispatch on `main`, after a successful install, and only when the manifest was written from the installed packages. Pull requests restore `main`'s entry and save none. A failed lookup, restore or save never fails the job or changes its result. The AVD and its snapshots are never cached, so every run boots a fresh emulator.

The uiautomator2 server jar comes from the actions cache under the key `u2-jar-<hash of packages/thumbjar/src/device/u2-jar.json>`. That file pins the jar's URL and its sha256, so a new jar gets a new key. `thumbjar fetch-u2-jar` checks a restored jar's hash and downloads it again when the hash differs, and its log line says whether it downloaded the jar. After a fetch on a miss, the job saves the jar from any branch or pull request. A pull request's entry is read only by runs of that pull request, and `main`'s, which the nightly run and a manual dispatch on `main` save, by every branch. A failed restore or save never fails the job.

Before retrying installation, the job clears only new `PackageOperation` directories under `$ANDROID_HOME/.temp` and new package directories from that install, and the packages the cache check kept, preserving other paths present before the attempt. These hold the downloaded archive, unpacked files and installer resume metadata. It does not clear the SDK's other packages or `~/.android/cache`. If `install-start` failed before recording its snapshot, sdkmanager never ran, so the retry clears nothing and reports the missing snapshot.

### Time budget

thumbjar bounds one `typeOnDevice` call at 520 seconds, one `runOnDevice` call at 636 and its device prep at `prepWorstSeconds` of the keyboard, 632 seconds for English and 889 for Japanese. The workflow's `timeout-minutes` cap the steps around them, and work inside the emulator runner action, its SDK checks, AVD creation and shutdown, is bounded only by its step's cap. `scripts/budget.mjs` holds the numbers below, and `scripts/budget.test.ts` fails when the script or the workflow stops matching them:

1. `run-on-device.sh <file>` runs each stage under `timeout -k`: counting the file's tests and reading its test stage's cap, `deviceTestFileSeconds` from `thumbjar/vitest`, in 15 seconds, and `thumbjar prepare`, Play Store block included, in 632 for English and, with the Japanese dictionary wait, 889 for Japanese. The test file runs under that cap: 661 seconds for each of its tests, the device test timeout that covers the longer `runOnDevice` call, 40 for the global setup, 30 for its device check, 5 to stop that adb and 5 for the page check, and 60 for Vitest's own start and exit, so a test that times out last still leaves thumbjar's setup file room to fail the file. For three tests that is 2083 seconds. With its 10 seconds to stop, the tests take at most 2093 seconds, the device check after a failed prep or test stage 15 and the diagnostics after the tests 65, so the script on a file of three tests ends within 2820 seconds for English and 3077 for Japanese, under 48 and 52 minutes. The unit test checks the count of each file against the tests Vitest collects.
2. Each matrix row carries its run steps' cap, `run_minutes`: 6 minutes for the boot, the script on the row's file for its keyboard, 3 for the emulator runner's SDK checks, AVD creation and shutdown, and 1 of headroom, rounded up to a minute. The headroom covers the action starting the script, the shell and `pnpm` starting each stage and the logging between stages, which no cap counts, so the step's cap never stops the script before it logs a stage's own reason. That is 62 minutes for `ja.test.ts` and 57 for `en.test.ts`. The 6 minutes are the emulator runner's polling allowance, `emulator-boot-timeout`, not a cap: the runner checks it only between `adb` polls that have no timeout of their own, so a hung poll outlasts it. The 3 minutes are not a timer of their own either. The run step's `timeout-minutes` is the bound on all of them, and when they take longer it stops the step. A run it stops after boot, before its device check completes, is not retried and its result says so, see the retry above. The packages download beforehand in their own 8-minute step, with another 8 minutes if installation is retried, so the runner's own install only checks them. A file with more tests raises both run steps of its row.
3. Every step has a `timeout-minutes`. Each row's job cap, `job_minutes`, is the sum of the step caps on the path where the first run fails and the retry runs in full and a minute for the runner between steps, so the Result step still runs: 65 for naming the suite, setup, the jar's cache and its fetch, the SDK cache, the SDK and the page build, the row's run steps twice, 8 for the retry decision, the boot time, the result and the upload, and the minute. That is 198 minutes for `ja.test.ts` and 188 for `en.test.ts`. A job without an emulator run retry ends within 136 and 131, including an install retry: the 65 before the emulator, the row's run step once, the 8 after it and the minute, where the retry decision still runs and decides not to retry. The jar fetch step's cap, 3 minutes, is thumbjar's `FETCH_U2_JAR_WORST_SECONDS`, 165 seconds, and 15 for `pnpm` and Node to start, rounded up to a minute.

Apart from the boot allowance and the runner's 3 minutes, these are enforced caps, not expected times. A typical job takes about 10 minutes.

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
IME_LANG=ja android/run-on-device.sh tests/ja.test.ts
```

`run-on-device.sh` expects a freshly booted emulator. It runs from `packages/editor`, as the workflow does, serves `android/dist/` on port 8765, prepares the device for `IME_LANG` with `thumbjar prepare`, runs the one test file it is given and writes everything to `android/out/`.

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

Each test adds about a minute or two to its job. It also adds 661 seconds to its file's cap, and when the file is the largest the matrix runs, `pnpm test:android:unit` fails until each run step's `timeout-minutes` and the job's are raised to the numbers it prints. A new test file needs its own row in the workflow's matrix. A page other than `plain.html`, `textarea.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a call to `recordInput` from `thumbjar/page`.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`: the device tests CI runs. `tests/en-textarea.test.ts`: the `textarea` control, run by hand.
2. `page/`: the test pages, built with Vite from the workspace editor by `pnpm build:android`.
3. `run-on-device.sh`: runs inside the booted emulator. It serves the pages, runs `thumbjar prepare` for `IME_LANG` and the test file it is given, checks for the device after a failed stage and records diagnostics after the tests.
4. `scripts/device-suites.test.ts` and `scripts/fixtures/`: run `tests/ja.test.ts` against fake typing results.
5. `scripts/budget.mjs`: the time budget of `run-on-device.sh` and the workflow's caps, derived from the number of tests in each file. `scripts/budget.test.ts` checks the matrix, the script and the caps against it.
6. `scripts/emulator-runs.mjs`: the device check after a failed stage, the retry decision and the job's result line, all read from `timing.txt`. `scripts/emulator-runs.test.ts` and `scripts/run-on-device.test.ts` run them against recorded `adb get-state` outputs and fake devices.
7. `../vitest.android.config.ts`: the `device` project from thumbjar's `deviceProject` and the `android-unit` project.
