# Android device tests

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with. The typing, its retries and its time bounds come from `thumbjar`, see `packages/thumbjar/README.md`.

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

It runs on pull requests that touch the editor's input handling, this directory or `packages/thumbjar`, every night against `main`, and on demand. It skips the Version Packages pull requests, whose head branch is `changeset-release/main` or `changeset-release/next`, which only bump versions and changelogs.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

## Reading a run

A job goes red when a device prep step failed, or a test failed, including a test whose editor assertion did not hold, or as an infrastructure failure when the SDK install failed twice, the emulator never booted, adb lost the device or Gboard's Japanese dictionary never loaded on the retry too. The workflow is not a required check, so a red job blocks no merge. The Result step's `run outcome` lines, also in the job summary, say which. A failing run can print two: its existing diagnosis followed by a pin verification failure:

1. `run outcome: the emulator install failed twice, infrastructure failure, not a test result` means SDK installation failed on both attempts, with an `INSTALL_RETRY` line naming the retry. No emulator run started, and Boot time prints nothing without `timing.txt`. A cancelled job with no `EMULATOR_START` line in `timing.txt`, including a missing file, reads `run outcome: cancelled`. Once an emulator run started, its run result retains any retry reason. If an earlier step failed before either install ran, the result reads `run outcome: no emulator run, a step before the emulator install failed`. A successful install retry prints `install outcome: retried once after a failed install` before the unchanged run result, in both the log and job summary.
2. `run outcome: device lost twice, infrastructure failure, not a test result`, or a line naming an emulator that never booted or Gboard's Japanese dictionary that never loaded, means the emulator failed on both runs. A line saying the run ended after boot without a completed device check means the last run stopped before its check could record a verdict. Say nothing about the editor from either.
3. A `PREP FAILED: <step>` line means the device was never ready and no test ran. The `run outcome` line quotes it after `the prep failed:`, for example when Gboard did not convert with its Japanese dictionary after the load. `phases.log` and, for Japanese, `ja-setup.log` and `ja-dictionary.log` show where it stopped.
4. `run outcome: emulator process <pid> ran …` means a recorded executable is outside the pinned directory or that directory’s version or build disagrees with the pin. `run outcome: emulator executable record <file> could not be read; the launched emulator cannot be verified` means the named record could not be read. Either fails the job.
5. `run outcome: no emulator process was recorded; the launched emulator cannot be verified` fails an otherwise passing run. A passing run must provide evidence of the pin; failing and cancelled runs without a record keep their existing diagnosis.
6. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual
   values, and the `github-actions` reporter annotates the test file and writes the job summary. A
   driver fault the driver retried prints a `Driver fault in <test>` line. `runOnDevice` retries a fault before input once,
   and a classified mistap once even after input, after stopping the old Chrome and checking the new
   pid. A second mistap ends `inconclusive` with the
   mistap message. Other faults after input are not retried. Mistaps are unexpected digits absent
   from the inputs, or a symbol tap whose own `insertText` beforeinput reports a recorded long-press
   popup character. Symbol classification requires one event per tap, in order, so page text the
   editor rewrote never classifies as a symbol mistap. The per-file job summary counts every mistap
   retry the driver began and names its test.

Each job retries once, on a fresh emulator, when the first emulator never booted (a `BOOT_RETRY` line), when adb lost the device after boot, during prep or the tests (a `DEVICE_LOST_RETRY` line), or when Gboard's Japanese dictionary never loaded on a device the check found reachable (a `DICTIONARY_RETRY` line). The lines also go to the job summary, and the `run outcome` line names the retry. `thumbjar prepare` exits 3 for that dictionary and 1 for every other prep failure, and `thumbjar run` writes `PREP DICTIONARY_NOT_LOADED` to `timing.txt` for status 3 only, so the retry never reads the prep's reason. Any other failure on a device adb still reaches is never retried, whether a test, another prep step, the dictionary check after the load or a driver fault failed. A dictionary that never loaded on the first run, then a run that could not retry, quotes the prep's reason like any other prep failure. After a prep or test stage fails, `thumbjar run` reads `adb get-state` once, with its stdout apart from its stderr, where adb prints its daemon start-up lines, and writes its verdict to `timing.txt` as one line before anything else: `CHECKED device` when stdout is `device`, and `CHECKED lost` when stdout is `offline` or adb fails with `error: device offline`, the answer of a dead emulator, or reports no such device (`no devices/emulators found`, `device '<serial>' not found`). Anything else proves nothing and gets no verdict: a device that is `unauthorized`, in `bootloader` or `recovery` or in another state is still there, any other adb error says nothing about the device, and an `adb get-state` that does not answer within 5 seconds may only be a slow adb server. A retry on a reachable device could turn a real test failure into a passing retry. The read runs once the stage has ended, so it never changes a test's outcome. A run that needed no check writes `CHECKED skipped`. A lost verdict is retried whatever stops the run after it. A run that ended after boot without a verdict, because the step's `timeout-minutes` or the check's own timeout stopped it first or `adb get-state` proved nothing, is never retried. Its result reads `run outcome: the run ended after boot without a completed device check, not a test result`. A cancelled run reads `run outcome: cancelled`. `.github/scripts/emulator-runs.mjs` decides the retry and the result from `timing.txt`, and the Boot time step prints each run's boot as `BOOT_SECONDS run <n>: <seconds>`.

Each job uploads an `android-ime-<file>-api36-<attempt>` artifact, `android-ime-ja-api36-1` for `tests/ja.test.ts`, with `vitest.log`, `phases.log`, `logcat.txt`, `diagnose.txt` and thumbjar's per-test artifacts: the page's state after each word as `<lang>-<test>.json`, screenshots and Gboard accessibility dumps.

The artifact also holds evidence about why the emulator process exited. `host.log` gets a line every 2 seconds. The line gives the host's available memory, free swap and one-minute load, and the emulator process's resident memory and state. When the sampler loses a process it was following, `host.log` gets a `QEMU_GONE` line. `host-dmesg.txt` is the host's kernel log. `host-disk.txt` and `host-memory.txt` hold `df -h`, `free -m` and `/proc/meminfo` from the end of the job. `host-exe-<pid>.txt` holds each adopted emulator process’s executable, independently of core capture, when `readlink` returns a path. `emu-crash/` holds the emulator's crash data when it wrote any.

Before the emulator starts, the job sends core dumps to a new directory. The core capture needs passwordless sudo. Hosted runners have it. The directory is on whichever of `/tmp`, `/mnt` and the runner's temporary directory has the most free space. `host-core-dir.txt` names the directory. `host-core-pattern.txt` holds the kernel core pattern the job replaced. `host-core-setup.txt` holds the setup output. It lists free space for `/`, `/mnt` and the runner's temporary directory, then the new core pattern, the gdb install output and gdb's path. `host-emulator-version.txt` holds the emulator's version. `host-core-limits-<pid>.txt` holds its resource limits. A process that crashes later in the job writes its core to the new directory too. At the end of the job, gdb reads each emulator core. `host-core.txt` starts each core with its PID, signal, size, executable and the emulator's version. Under that, an emulator core gets the faulting thread's backtrace and the top five frames of every thread. When gdb could not be installed, it gets `stacks unavailable: gdb could not be installed` instead. A core from any other process gets no backtrace. Then every core is deleted and the original pattern is restored. `host-core-pattern-after.txt` holds the core pattern the kernel has after the restore. The same cleanup runs when `host-core.sh capture` receives TERM. `host-capture.sh` sends it TERM when the capture passes its 300-second limit. A TERM sent to `host-capture.sh` does not reach `host-core.sh`. `host-core.sh` then finishes its cleanup on its own. SIGKILL cannot be caught, so it skips the cleanup. A skipped cleanup does no harm on hosted runners, because GitHub discards a hosted runner after its job. Cores are never uploaded.

The job summary gets one `host evidence:` line for each emulator exit the sampler logged. The line gives the exit time in UTC and says whether the exit came at teardown or mid-run. Teardown means within 120 seconds after the run finished. When the emulator left a core, the line names the core's signal, for example `emulator crashed (SIGSEGV)`. Without a core, the line adds `host OOM` when the kernel log shows the OOM killer took the process. It adds `emulator crashed` when the kernel log shows a segfault or trap for the process. An emulator core whose exit the sampler did not log gets its own line: `emulator process <pid> crashed (<signal>), the host sampler logged no exit for it`. A core whose pid the sampler never recorded as an emulator gets a `non-emulator process` line. When there is no logged exit and no core, the summary says `the host sampler saw no emulator process exit`. When `host.log` is empty and there is no core, it says `no host sampler log`.

After two consecutive samples outside the `S` (sleeping) and `R` (running) states, the sampler writes `host-freeze-<pid>-1.txt`. It lists each thread's TID, name, state and wait channel from `/proc`. It adds each thread's kernel stack when passwordless sudo is available. If the process is still outside those states 30 seconds later, the sampler writes `host-freeze-<pid>-2.txt`. The two files describe the latest continuous freeze. If the process recovers and then freezes again, the new first capture overwrites the old one and the old second capture is deleted. If the process was outside `S` and `R` for at least two consecutive samples before it exited, the exit line adds `emulator froze at <time> UTC`. The time is that of the first of those samples. These lines never change the `run outcome` line.

The jobs run Android Emulator 37.2.12 (build 16428233), pinned in `.github/scripts/emulator-pin.json`. The job unpacks the release archive, after checking its size and SHA-256, into an empty `$ANDROID_HOME/emulator`, which is what `reactivecircus/android-emulator-runner` launches, or restores that directory from the cache and checks its version, build and manifest file sizes. Version 37.2.13 crashes during guest process cleanup ([a report of the same crash in ZeroC Ice](https://github.com/zeroc-ice/ice/issues/6984), [upstream report](https://issuetracker.google.com/568480829)).

The pin has no `package.xml`, so `sdkmanager` does not see it as installed. The action's own `sdkmanager --install emulator` puts the current emulator into `$ANDROID_HOME/emulator-2`, which nothing launches or caches. That download runs in every emulator run step; an outage reads as a boot failure while the pin is on disk.

The sampler records each adopted process’s executable independently of core capture, only when `readlink` returns a path. The Result step checks every `host-exe-<pid>.txt` against the pinned directory and its version and build. A mismatch fails any run: it replaces a passing outcome line, or follows an existing failure or cancellation line. Missing process evidence fails only an otherwise passing run; failing and cancelled runs keep their diagnosis.

Move off the pin when a stable release runs the device jobs without this crash, removing the `install-emulator` lines and pin file and updating the cache and Result step checks.

The emulator and the `google_apis_playstore` x86_64 system image come from the actions cache when it holds the pinned emulator and the system image a fresh install picks. The runner image ships platform-tools and the platform, so they are not cached. The cache key names the runner OS, API level, image, available image revision, and pinned emulator build. Looking up the image revision with `sdkmanager --list` takes about 3 seconds. A lookup that fails, or an SDK that already has one of the two packages, skips the cache. `sdkmanager` does not check a restored package's files, so every save carries a manifest with the cache's key and each file in the two packages with its size. A file name with a tab, a newline or a carriage return fails the manifest, and nothing is saved. After a restore, `.github/scripts/emulator-runs.mjs cache-check` rejects an emulator whose `source.properties` does not name the pinned version and build, deletes both packages when the manifest names another key, and deletes a package that has a file missing, added or of another size, or that the manifest does not list. Installation downloads deleted packages as on a miss. A check that fails or times out deletes both packages. Only runs on `main` save, the nightly schedule and a manual dispatch on `main`, after a successful install, and only when the manifest was written from the installed packages. Pull requests restore `main`'s entry and save none. A failed lookup, restore or save never fails the job or changes its result. The AVD and its snapshots are never cached, so every run boots a fresh emulator.

The uiautomator2 server jar at `packages/editor/node_modules/.cache/thumbjar/u2.jar` comes from the actions cache under the key `u2-jar-<hash of packages/thumbjar/src/device/u2-jar.json>`. That file pins the jar's URL and its sha256, so a new jar gets a new key. `thumbjar fetch-u2-jar` checks a restored jar's hash and downloads it again when the hash differs, and its log line says whether it downloaded the jar. After a fetch on a miss, the job saves the jar from any branch or pull request. A pull request's entry is read only by runs of that pull request, and `main`'s, which the nightly run and a manual dispatch on `main` save, by every branch. A failed restore or save never fails the job.

Before retrying installation, the job clears the pinned emulator directory and its download, plus new `PackageOperation` directories under `$ANDROID_HOME/.temp` and new package directories from that install, and the packages the cache check kept, preserving other paths present before the attempt. These hold the downloaded archive, unpacked files and installer resume metadata. It does not clear the SDK's other packages or `~/.android/cache`. If `install-start` failed before recording its snapshot, sdkmanager never ran, so the retry clears nothing and reports the missing snapshot.

English prep first types `hello` and Space into `editor.html`, opened with `thumbjar=english-warmup` added to its address, so Chrome and Gboard are past their first use before tests start. The page receives that input. A page that saves what it receives will save `Hello`. Prep accepts "Hello", ignoring case, with a space, a non-breaking space or nothing after it, then closes Chrome. Wrong text is retried. Prep fails after three attempts. Each outcome goes to `en-warmup.jsonl`, `en-warmup.log` and the GitHub step summary. The `en-warmup-<attempt>` artifacts keep the page's events and screenshots for each attempt. Count warm-up retries alongside first-test failures when re-measuring cold drops.

### Time budget

thumbjar bounds each `runOnDevice` call and the device prep. `thumbjar run` gives the cap read and device check 10 seconds with 5 to stop, the test stage `deviceTestFileSeconds` for the file's test count with 10 to stop, and the final diagnostics 60 seconds with 5 to stop. Node guards enforce the child deadlines with SIGTERM followed by SIGKILL even if the run process is killed. Prep enforces its own per-language deadline, and the server stops when its connection to the run process closes. The English warm-up gets 180 seconds plus 10 to stop. That makes English prep 822 seconds with its kill grace. Japanese prep stays at 889 seconds. The nine-test English insert-break row needs 124 minutes per run step (7,382 seconds worst case). The job cap is 331 minutes for both attempts and all other steps. These are upper bounds, not measured warm-up durations.

The workflow's `timeout-minutes` are flat backstops, including for a hang inside the emulator runner action. A run a step's cap stops after boot, before its device check completes, is not retried and its result says so, see the retry above.

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

Each test adds about a minute or two to its job and increases its file's test stage cap. A new test file needs its own row in the workflow's matrix, and the row's `runMinutes` is the cap of both run steps. It must cover the whole run step, which is the runner setup, the boot wait, the cap read, the prep, the file's test stage, the device check and the diagnostics, each at its bound with the kill graces of its commands (`runStepWorstSeconds` in thumbjar), and `scripts/budget.test.ts` checks that for every row and that the job cap stays at or under 360 minutes. A page other than `plain.html`, `textarea.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a call to `recordInput` from `thumbjar/page`.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`, `tests/ja.enter.test.ts`, `tests/en.enter.test.ts`, `tests/en.insert.break.test.ts`, `tests/en.insert.text.test.ts`: the device tests CI runs. `tests/en-textarea.test.ts`: the `textarea` control, run by hand.
2. `page/`: the test pages, built with Vite from the workspace editor by `pnpm build:android`.
3. `thumbjar run`: runs inside the booted emulator. It serves the pages, runs `thumbjar prepare` for `--keyboard` and the test file it is given, checks for the device after a failed stage and records diagnostics after the tests.
4. `scripts/device-suites.test.ts` and `scripts/fixtures/`: run `tests/ja.test.ts` against fake typing results.
5. `scripts/budget.test.ts`: checks thumbjar's test count against the tests Vitest collects.
6. `.github/scripts/emulator-runs.mjs`: the retry decision and the job's result line, both read from `timing.txt`. `.github/scripts/emulator-runs.test.ts` checks those decisions; thumbjar's tests check the device command against recorded `adb get-state` outputs and fake devices.
7. `.github/scripts/host-sampler.sh` and `.github/scripts/host-capture.sh`: the sampler the workflow starts after the install and the capture that stops it and writes the host files. `.github/scripts/host-evidence.test.ts` checks the `host evidence:` lines against fixture text and `.github/scripts/host-scripts.test.ts` runs both scripts against a fake emulator process.
8. `../vitest.android.config.ts`: the `device` project from thumbjar's `deviceProject` and the `android-unit` project.
