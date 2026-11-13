# Android device tests

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with. The typing, its retries and its time bounds come from `thumbjar`, see `packages/thumbjar/README.md`.

`vitest.config.ts` excludes `android/` from the editor's normal Vitest projects, and the tests run through their own config, `vitest.android.config.ts`. `test:unit` separately runs `test:android:unit`, the suite that checks `tests/ja.test.ts` against fake typing results, and never any device work.

## What runs in CI

The workflow `.github/workflows/android-ime.yml` runs one job per device test file in its matrix, each on its own freshly booted API 36 emulator with the Play Store image, prepared for the language in the file's row:

1. `tests/ja.test.ts`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `tests/en.test.ts`: plain English typing, where Gboard commits each letter as it goes.
3. `tests/ja.enter.test.ts` and `tests/en.enter.test.ts`: Enter in the editor on each keyboard, see below.

`tests/ja.test.ts` and `tests/en.test.ts` have three tests each:

1. A plain `contenteditable` with no editor, `plain.html`, as the control.
2. The editor with one empty block, `editor.html`.
3. The editor with one block that already holds `x`, `editor.html?prefix=x`.

The two Enter files have two tests each, as `runOnDevice` step lists on `editor.html`. One starts with `- ` in the block and taps Enter. The other starts empty, types `- ` on the symbol layout with a `compose` step whose `commit` is `none`, and then taps Enter. Each asserts the field's text, and each step's status, text, selection, focus and count of `insertParagraph` `beforeinput` events.

`tests/en-textarea.test.ts` types `kyou` twice on English Gboard into a plain `textarea`, `textarea.html`, and expects `Kyou kyou `. It is a control for `textarea` support in thumbjar, and CI never runs it, since the workflow's matrix has no row for it. Run it against a prepared device with `pnpm test:android --run tests/en-textarea.test.ts`.

It runs on pull requests that touch the editor's input handling, this directory or `packages/thumbjar`, every night against `main`, and on demand. It skips the Version Packages pull requests, whose head branch is `changeset-release/main` or `changeset-release/next`, which only bump versions and changelogs.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

## Reading a run

A job goes red when a device prep step failed, or a test failed, including a test whose editor assertion did not hold, or as an infrastructure failure when the SDK install failed twice, the emulator never booted, adb lost the device or Gboard's Japanese dictionary never loaded on the retry too. The workflow is not a required check, so a red job blocks no merge. The Result step's `run outcome` line, also in the job summary, says which:

1. `run outcome: the emulator install failed twice, infrastructure failure, not a test result` means SDK installation failed on both attempts, with an `INSTALL_RETRY` line naming the retry. No emulator run started, and Boot time prints nothing without `timing.txt`. A cancelled job with no `EMULATOR_START` line in `timing.txt`, including a missing file, reads `run outcome: cancelled`. Once an emulator run started, its run result retains any retry reason. If an earlier step failed before either install ran, the result reads `run outcome: no emulator run, a step before the emulator install failed`. A successful install retry prints `install outcome: retried once after a failed install` before the unchanged run result, in both the log and job summary.
2. `run outcome: device lost twice, infrastructure failure, not a test result`, or a line naming an emulator that never booted or Gboard's Japanese dictionary that never loaded, means the emulator failed on both runs. A line saying the run ended after boot without a completed device check means the last run stopped before its check could record a verdict. Say nothing about the editor from either.
3. A `PREP FAILED: <step>` line means the device was never ready and no test ran. The `run outcome` line quotes it after `the prep failed:`, for example when Gboard did not convert with its Japanese dictionary after the load. `phases.log` and, for Japanese, `ja-setup.log` and `ja-dictionary.log` show where it stopped.
4. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual
   values, and the `github-actions` reporter annotates the test file and writes the job summary. A
   driver fault the driver retried prints a `Driver fault in <test>` line. Each driver call retries
   a classified mistap once, including after input under `runOnDevice`, after stopping the old
   Chrome and checking the new pid. A second mistap under `runOnDevice` ends `inconclusive` with the
   mistap message. Other faults after input are not retried. Mistaps are unexpected digits absent
   from the inputs, or a symbol tap whose own `insertText` beforeinput reports a recorded long-press
   popup character. Symbol classification requires one event per tap, in order, so page text the
   editor rewrote never classifies as a symbol mistap. The per-file job summary counts every mistap
   retry the driver began and names its test, under both drivers.

Each job retries once, on a fresh emulator, when the first emulator never booted (a `BOOT_RETRY` line), when adb lost the device after boot, during prep or the tests (a `DEVICE_LOST_RETRY` line), or when Gboard's Japanese dictionary never loaded on a device the check found reachable (a `DICTIONARY_RETRY` line). The lines also go to the job summary, and the `run outcome` line names the retry. `thumbjar prepare` exits 3 for that dictionary and 1 for every other prep failure, and `thumbjar run` writes `PREP DICTIONARY_NOT_LOADED` to `timing.txt` for status 3 only, so the retry never reads the prep's reason. Any other failure on a device adb still reaches is never retried, whether a test, another prep step, the dictionary check after the load or a driver fault failed. A dictionary that never loaded on the first run, then a run that could not retry, quotes the prep's reason like any other prep failure. After a prep or test stage fails, `thumbjar run` reads `adb get-state` once, with its stdout apart from its stderr, where adb prints its daemon start-up lines, and writes its verdict to `timing.txt` as one line before anything else: `CHECKED device` when stdout is `device`, and `CHECKED lost` when stdout is `offline` or adb fails with `error: device offline`, the answer of a dead emulator, or reports no such device (`no devices/emulators found`, `device '<serial>' not found`). Anything else proves nothing and gets no verdict: a device that is `unauthorized`, in `bootloader` or `recovery` or in another state is still there, any other adb error says nothing about the device, and an `adb get-state` that does not answer within 5 seconds may only be a slow adb server. A retry on a reachable device could turn a real test failure into a passing retry. The read runs once the stage has ended, so it never changes a test's outcome. A run that needed no check writes `CHECKED skipped`. A lost verdict is retried whatever stops the run after it. A run that ended after boot without a verdict, because the step's `timeout-minutes` or the check's own timeout stopped it first or `adb get-state` proved nothing, is never retried. Its result reads `run outcome: the run ended after boot without a completed device check, not a test result`. A cancelled run reads `run outcome: cancelled`. `.github/scripts/emulator-runs.mjs` decides the retry and the result from `timing.txt`, and the Boot time step prints each run's boot as `BOOT_SECONDS run <n>: <seconds>`.

Each job uploads an `android-ime-<file>-api36-<attempt>` artifact, `android-ime-ja-api36-1` for `tests/ja.test.ts`, with `vitest.log`, `phases.log`, `logcat.txt`, `diagnose.txt` and thumbjar's per-test artifacts: the page's state after each word as `<lang>-<test>.json`, screenshots and Gboard accessibility dumps.

The artifact also records why the emulator process exited, when it did. `host.log` has a line every 2 seconds with the host's free memory, swap and load and the emulator process's size and state, and a `QEMU_GONE` line when a process it followed disappears. `host-dmesg.txt` is the host's kernel log, `host-disk.txt` and `host-memory.txt` hold `df -h`, `free -m` and `/proc/meminfo` from the end of the job, and `emu-crash/` holds the emulator's crash data when it wrote any. The job summary gets a `host evidence:` line for each exit, with its time, whether it came at teardown or mid-run, and `host OOM` or `emulator crashed` when the kernel log names the process. After two consecutive samples outside `S` or `R`, `host-freeze-<pid>-1.txt` records each thread's TID, name, state and wait channel from `/proc`, plus its kernel stack when passwordless sudo permits it. A second capture, `host-freeze-<pid>-2.txt`, follows at least 30 seconds later if the process is still outside `S` or `R`, and there are never more than two captures per tracked process. The exit summary adds the first sample's freeze time when at least two consecutive abnormal samples precede that exit without a recovery. A job with no exit says so. These lines never change the `run outcome` line.

The emulator and the `google_apis_playstore` x86_64 system image come from the actions cache when it holds the versions a fresh install picks. The runner image ships platform-tools and the platform, so they are not cached. The cache key names the runner OS, the API level, the image, and the image revision and emulator version that `sdkmanager --list` reports as available at the lookup, which takes about 3 seconds. A lookup that fails, or an SDK that already has one of the two packages, skips the cache. `sdkmanager --install` never upgrades or repairs an installed package, it only checks that its directory exists, so every save carries a manifest with the cache's key and each file in the two packages with its size. A file name with a tab, a newline or a carriage return fails the manifest, and nothing is saved. After a restore, `.github/scripts/emulator-runs.mjs cache-check` deletes both packages when the manifest names another key, and a package that has a file missing, a file added or a file of another size, or that the manifest does not list, and the install downloads it as on a miss. A check that fails or times out deletes both packages. Only runs on `main` save, the nightly schedule and a manual dispatch on `main`, after a successful install, and only when the manifest was written from the installed packages. Pull requests restore `main`'s entry and save none. A failed lookup, restore or save never fails the job or changes its result. The AVD and its snapshots are never cached, so every run boots a fresh emulator.

The uiautomator2 server jar at `packages/editor/node_modules/.cache/thumbjar/u2.jar` comes from the actions cache under the key `u2-jar-<hash of packages/thumbjar/src/device/u2-jar.json>`. That file pins the jar's URL and its sha256, so a new jar gets a new key. `thumbjar fetch-u2-jar` checks a restored jar's hash and downloads it again when the hash differs, and its log line says whether it downloaded the jar. After a fetch on a miss, the job saves the jar from any branch or pull request. A pull request's entry is read only by runs of that pull request, and `main`'s, which the nightly run and a manual dispatch on `main` save, by every branch. A failed restore or save never fails the job.

Before retrying installation, the job clears only new `PackageOperation` directories under `$ANDROID_HOME/.temp` and new package directories from that install, and the packages the cache check kept, preserving other paths present before the attempt. These hold the downloaded archive, unpacked files and installer resume metadata. It does not clear the SDK's other packages or `~/.android/cache`. If `install-start` failed before recording its snapshot, sdkmanager never ran, so the retry clears nothing and reports the missing snapshot.

### Time budget

thumbjar bounds each `typeOnDevice` and `runOnDevice` call and the device prep. `thumbjar run` gives the cap read and device check 10 seconds with 5 to stop, the test stage `deviceTestFileSeconds` for the file's test count with 10 to stop, and the final diagnostics 60 seconds with 5 to stop. Node guards enforce the child deadlines with SIGTERM followed by SIGKILL even if the run process is killed. Prep enforces its own per-language deadline, and the server stops when its connection to the run process closes. The workflow's `timeout-minutes` are flat backstops, including for a hang inside the emulator runner action. A run a step's cap stops after boot, before its device check completes, is not retried and its result says so, see the retry above.

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

`thumbjar run` expects a freshly booted emulator. It runs from `packages/editor`, as the workflow does, serves `android/dist/` on port 8765, prepares the device for `--keyboard` with `thumbjar prepare`, runs the one test file it is given and writes everything to `android/out/`.

Once a device is prepared and the server runs, run the tests again without the prep, from `packages/editor`:

```
pnpm exec thumbjar serve android/dist --port 8765 &
adb reverse tcp:8765 tcp:8765
pnpm test:android --run tests/ja.test.ts
```

`test:android` runs every test file in `tests/` unless given one. It fails at once when `adb` has no device or the page is not served. Run one file per prepared device, as CI does: `ja.test.ts` leaves Gboard on Japanese, and `en.test.ts` never switches it back.

Without an emulator, `pnpm test:android:unit` runs `tests/ja.test.ts` against fake typing results and checks the time budget, and `pnpm check:types` checks the tests.

## Adding a test

Add the test to the file for its language. It calls `typeOnDevice` from `thumbjar` with the test's `context` and the page's `url`, the `keyboard`, the `prefix` the block holds and the `words` to type, and asserts on what it returns. thumbjar's README describes each option and result. For example, to check that Japanese composition after a full-width prefix commits without a restarted composition, typing `sakura` and committing 桜:

```ts
test('Scenario: Typing sakura after full-width text', async (context) => {
  const typed = await typeOnDevice(context, {
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

Each test adds about a minute or two to its job and increases its file's test stage cap. A new test file needs its own row in the workflow's matrix. A page other than `plain.html`, `textarea.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a call to `recordInput` from `thumbjar/page`.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`, `tests/ja.enter.test.ts`, `tests/en.enter.test.ts`: the device tests CI runs. `tests/en-textarea.test.ts`: the `textarea` control, run by hand.
2. `page/`: the test pages, built with Vite from the workspace editor by `pnpm build:android`.
3. `thumbjar run`: runs inside the booted emulator. It serves the pages, runs `thumbjar prepare` for `--keyboard` and the test file it is given, checks for the device after a failed stage and records diagnostics after the tests.
4. `scripts/device-suites.test.ts` and `scripts/fixtures/`: run `tests/ja.test.ts` against fake typing results.
5. `scripts/budget.test.ts`: checks thumbjar's test count against the tests Vitest collects.
6. `.github/scripts/emulator-runs.mjs`: the retry decision and the job's result line, both read from `timing.txt`. `.github/scripts/emulator-runs.test.ts` checks those decisions; thumbjar's tests check the device command against recorded `adb get-state` outputs and fake devices.
7. `.github/scripts/host-sampler.sh` and `.github/scripts/host-capture.sh`: the sampler the workflow starts after the install and the capture that stops it and writes the host files. `.github/scripts/host-evidence.test.ts` checks the `host evidence:` lines against fixture text and `.github/scripts/host-scripts.test.ts` runs both scripts against a fake emulator process.
8. `../vitest.android.config.ts`: the `device` project from thumbjar's `deviceProject` and the `android-unit` project.
