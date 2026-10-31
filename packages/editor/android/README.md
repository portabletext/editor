# Android IME

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with in Vitest tests.

## What it checks and why a real keyboard

Android keyboards do not send key events. Gboard composes text through the input method, and Chrome turns that into `compositionstart`, `compositionupdate`, `beforeinput` and `input` events whose order and timing depend on the keyboard, its language and what the field already holds. Synthetic composition events in a desktop browser get the order right but not Gboard's reactions to the editor: when the editor rewrites the DOM under an open composition, Gboard can abort it and start a new one, and only a real keyboard shows that.

Each job boots an API 36 emulator with the Play Store image, so the Gboard is the one that ships on phones. It prepares the device and then runs the Vitest suite for its language. Each test opens a page in a fresh Chrome, taps the field, waits for Gboard, taps the letters of each word and commits it, and reads the text and the event log over the Chrome DevTools protocol.

The workflow `.github/workflows/android-ime.yml` runs two jobs:

1. `ja`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `en`: plain English typing, where Gboard commits each letter as it goes.

Each language has a test file in `tests/`, `tests/ja.test.ts` and `tests/en.test.ts`, with three tests each:

1. A plain `contenteditable` with no editor, `plain.html`, as the control.
2. The editor with one empty block, `editor.html`.
3. The editor with one block that already holds `x`, `editor.html?prefix=x`.

It runs on pull requests that touch the editor's input handling or this app, every night against `main`, and on demand.

## Reading a run

A job goes red when the emulator never booted, a device prep step failed, or a test failed, including a test whose editor assertion did not hold. The workflow is not a required check, so a red job blocks no merge. Read the log to tell the three apart:

1. A `PREP FAILED: <step>` line means the device was never ready and no test ran. `phases.log` and, for Japanese, `ja-setup.log` show where it stopped.
2. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual values, and the `github-actions` reporter annotates the test file and writes the job summary.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

### Retries

Only driver faults are retried, never an assertion. The helper `typeOnDevice` in `scripts/driver.ts` types and reads back the page. When it throws because of the device (the page never loaded over CDP, Gboard never showed, the switch to Japanese failed, uiautomator2 never answered, the system rejected an injected tap, or the attempt ran past 3 minutes) it stops the attempt's device calls, its adb processes and its screen dump, stops Chrome, opens the page again and types everything once more.

The driver reads the typed text to classify a fault in one case only: a digit that neither the prefix nor the typed letters hold. Only a tap that lands as a long press on a key's number hint types one. An editor that produced such a digit every time would fault twice and fail the test, so the retry could only hide one that produces it intermittently. Apart from this, the driver never compares the text with anything.

An expression that throws in the page, `window.__state()` or the editor's snapshot for instance, is not a driver fault. It can be an editor failure, so an attempt that reports one is never retried and the call ends there with the page's exception in its error, and `tests/setup.ts` fails the test file with that exception, whether or not the test is marked `test.fails`. The driver only evaluates expressions that can throw once `window.__state` exists, so a page still loading never raises one.

An adb process that outlives SIGTERM and SIGKILL may still be talking to the device. From then on the driver starts no attempt and no call, wherever the process was left, typing, the Chrome restart or the cleanup, and `tests/setup.ts` fails the test file whether or not its tests are marked `test.fails`. The retry prints a `PHASE ... RETRY <test>` line and a `Driver fault in <test>` line in the test's output. A second fault fails the test.

Vitest's own `retry` is 0, so a failed assertion fails the test on its first run.

A tap the system accepted but Gboard never registered is not detected. Gboard's accessibility tree has no pressed state for its keys and no composing text, the English layout shows no suggestion strip, and the Japanese candidate strip follows the composing text the editor can corrupt, so judging taps by it could retry an editor bug away. Such a dropped letter fails the test as a wrong text.

`test.fails` counts any error as its expected failure, a driver fault or a test timeout included. `typeOnDevice` records each call when it starts and marks it complete once it returned a result and cleaned up. `tests/setup.ts` fails the test file for a `test.fails` test whose call ended on a driver fault or never completed, naming the test. A driver fault can end a call after one attempt, when no retry is allowed.

### Time budget

The driver and `run-on-device.sh` cut every stage of their own off at a deadline, so a hang there ends as a logged failure. The workflow's `timeout-minutes` cap the steps around them, and work inside the emulator runner action, its SDK checks, AVD creation and shutdown, is bounded only by its step's cap:

1. One `typeOnDevice` call takes at most 535 seconds: two attempts of 180 seconds, each with a 30-second failure dump and 10 seconds to stop its uiautomator2 servers, a 20-second Chrome restart between them and 35 seconds of cleanup after, each stage with 5 seconds to stop. An adb process gets 2 seconds after SIGTERM and 2 more after SIGKILL, inside those 5. `scripts/lib/budget.ts` holds the bounds, and the device test timeout of 575 seconds is taken from them.
2. `run-on-device.sh` runs each stage under `timeout -k`: reading the test stage's cap from `scripts/lib/budget.ts` in 15 seconds, and the whole device prep, readiness check included, in 610. The ANR settle starts no new check after 240 seconds and ends within about 285, and the Japanese setup within 250. The test file runs under `DEVICE_TEST_FILE_SECONDS`, 1825 seconds: its three tests of 575 each, 40 for the global setup, 30 for its device check, 5 to stop that adb and 5 for the page check, and 60 for Vitest's own start and exit, so a test that times out last still leaves `tests/setup.ts` room to fail the file. With its 10 seconds to stop, the tests take at most 1835 seconds and the diagnostics after them 65, so the script ends within 2525 seconds, under 43 minutes. A unit test fails when a device test file declares more than three tests or the script stops reading its cap from `scripts/lib/budget.ts`.
3. Each run step allows 52 minutes: the emulator boot is capped at 6 by `emulator-boot-timeout` and the script at 43, which leaves about 3 for the emulator runner's SDK checks, AVD creation and shutdown. That is an allowance, not a timer of its own. If they take longer, the step's cap cancels the step. The packages download beforehand in their own 8-minute step, so the runner's own install only checks them.
4. Every step has a `timeout-minutes`. The job allows 153 minutes, the sum of the step caps on the path where the first run never boots and the retry runs in full: 39 for setup, the SDK and the page build, 52 for each run, and 8 for the boot check, the result and the upload, 151 in all. A job without a boot retry ends within 99.

These are enforced caps, not expected times. A typical job takes about 10 minutes.

### Artifacts

Each job uploads an `android-ime-<lang>-api36-<attempt>` artifact with:

1. `vitest.log`: Vitest's output, with the `PHASE` lines timing each driver step under the test that printed them.
2. `phases.log`: the device prep steps.
3. `<lang>-<test>.json`: the page's state after each word, the Gboard candidates and the keys the driver saw. `<test>` is the test name in lowercase with dashes, for example `ja-typing-kyou-twice-into-an-empty-block.json`. A retried test also has `-retry` files.
4. Screenshots before and after typing each word, Gboard accessibility dumps, logcat and `diagnose.txt` with the device, Gboard and Chrome versions.

## Running it

From the Actions tab, run the Android IME workflow on a branch with "Run workflow".

Locally, with an Android SDK, an API 36 `google_apis_playstore` x86_64 system image and Node 24:

```
pnpm install
pnpm exec turbo build --filter='android-ime^...'
pnpm --filter android-ime build:page
cd apps/android-ime
node scripts/fetch-u2-jar.ts
emulator -avd <your API 36 Play Store AVD> -no-snapshot &
adb wait-for-device
IME_LANG=ja scripts/run-on-device.sh
```

`run-on-device.sh` expects a freshly booted emulator. It prepares the device, serves `dist/` on port 8765, runs the tests for `IME_LANG` and writes everything to `out/`.

Once a device is prepared and the server runs, run the tests again without the prep:

```
node scripts/serve.ts dist 8765 &
adb reverse tcp:8765 tcp:8765
pnpm --filter android-ime test:device tests/ja.test.ts
```

`test:device` runs every test file in `tests/` unless given one. It fails at once when `adb` has no device or the page is not served. Run one file per prepared device, as CI does: `ja.test.ts` leaves Gboard on Japanese, and `en.test.ts` never switches it back.

To check the driver without an emulator:

```
pnpm --filter android-ime check:types
pnpm --filter android-ime test:unit
```

The unit tests parse real Gboard accessibility dumps and event logs from CI runs, check the retry, its time bounds and the `test.fails` accounting against a fake device, run `tests/ja.test.ts` against fake typing results, and check that an aborted attempt opens no uiautomator2 connection. Root `pnpm test:unit` runs them too. The device tests run only through `test:device`.

## Adding a test

A test calls `typeOnDevice` with:

1. `lang`: `ja` switches Gboard to Japanese QWERTY first, `en` leaves it on English.
2. `page`: `plain.html` or `editor.html`.
3. `prefix`: text the block holds before typing, `''` for an empty block.
4. `words`: each word's `letters`, tapped one key at a time, and optionally the `candidate` to tap to commit it. Without a candidate, or when Gboard does not offer it, the driver taps Space.

It returns:

1. `text`: the text after typing.
2. `picked`: how each word was committed, its candidate or `space`.
3. `compositionstart`: the number of `compositionstart` events.
4. `nested`: `compositionstart` events that arrived while a composition was still open. Above 0 means the keyboard restarted a composition, which loses or doubles text.
5. `compositionstartPerWord`: `compositionstart` events while each word was typed, for example whether Gboard composes the second word after the first was committed.

Add the test to the file for its language. For example, to check that Japanese composition after a full-width prefix commits without a restarted composition, typing `sakura` and committing 桜:

```ts
test('Scenario: Typing sakura after full-width text', async () => {
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
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

When Gboard has not loaded a word's candidates yet, the driver commits it with Space as kana, so a Japanese test accepts the kana for each word as well as the candidate. It never retries an assertion to get the candidate.

Then:

1. Run `pnpm --filter android-ime check:types`.
2. Run the workflow on your branch, or `test:device` against a local emulator, and check the new test's result.
3. If it fails on `main` because of a known bug, make it `test.fails` and describe the bug by its behavior in a comment inside the test.

Each test adds about a minute or two to its job. A page other than `plain.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a global `window.__state()` that returns `{text, events}`, which the driver reads.

## Files

1. `tests/ja.test.ts`, `tests/en.test.ts`: the device tests.
2. `tests/global-setup.ts`: stops the run before any test when there is no device or no page.
3. `tests/setup.ts`: fails a file in which an adb process outlived SIGKILL or the page threw while the driver typed, or whose `test.fails` test ended on a driver fault or never completed.
4. `scripts/driver.ts`: `typeOnDevice`, its retry and the time bounds around each attempt. `scripts/lib/typing.ts` drives one attempt through the uiautomator2 server and CDP.
5. `scripts/run-on-device.sh`: runs inside the booted emulator. It waits out the post-boot ANR storm, turns off system error dialogs, sets up Chrome and Gboard, serves the pages and runs the tests for `IME_LANG`.
6. `scripts/setup-ja.ts`: adds the Japanese QWERTY layout through Gboard's settings screens, since the Play image has no root to change the locale.
7. `scripts/serve.ts`: serves the built pages to the emulator.
8. `scripts/fetch-u2-jar.ts`: downloads the uiautomator2 server jar and checks its hash.
9. `scripts/lib/`: the adb, uiautomator2, CDP and accessibility dump helpers.
10. `scripts/fixtures/`: accessibility dumps and event logs from CI runs, for the unit tests.
11. `scripts/diagnose.sh`: records device facts and never fails the job.
12. `page/`: the test pages, built with Vite from the workspace editor.
13. `vitest.config.ts`: the `unit` and `device` projects.

The driver is TypeScript with no build step. Its only dependency is Vitest, which it imports for the current test. The prep scripts run directly on Node 24. adb runs through `child_process`, and CDP goes over the global `WebSocket` and `fetch` through `adb forward`.

## Known flakes

The emulator is slow on hosted runners, and each job takes about 10 minutes. Failures unrelated to the editor come from the emulator never coming online, the CDP connection to Chrome dropping, or Gboard rendering only half its keys. Over 16 workflow runs of this branch, all 32 jobs were green and 5 of 96 tests needed their one driver retry.
