<img src="assets/logo-64.svg" alt="thumbjar" width="64" height="64">

# thumbjar

Types on real Gboard in an Android emulator into a web page in Chrome, and reports what the page ended up with, for Vitest tests. Private to this monorepo: it has no build, and consumers import its TypeScript source through `workspace:*` and run it on Node 24's type stripping.

## Why a real keyboard

Android keyboards do not send key events. Gboard composes text through the input method, and Chrome turns that into `compositionstart`, `compositionupdate`, `beforeinput` and `input` events whose order and timing depend on the keyboard, its language and what the field already holds. Synthetic composition events in a desktop browser get the order right but not Gboard's reactions to the page: when a page rewrites the DOM under an open composition, Gboard can abort it and start a new one, and only a real keyboard shows that.

A test opens a page in a fresh Chrome, taps the field, waits for Gboard, taps the letters of each word and commits it, and reads the text and the event log over the Chrome DevTools protocol. Use an API 36 emulator with the Play Store image, so the Gboard is the one that ships on phones.

## API

### `thumbjar`

`typeOnDevice(options)` types on the device and returns what the page holds. It runs inside a Vitest test. Its options:

1. `url`: the page to type into, served on the host. The driver reverses a `localhost` port to the device with `adb reverse`, 80 or 443 when the URL names none, and sets `prefix` as its `prefix` search parameter, replacing any the URL already has, so the page can seed its field with it.
2. `keyboard`: `ja` switches Gboard to Japanese QWERTY (romaji) first, `en` leaves it on English.
3. `prefix`: text the field holds before typing, `''` for an empty field.
4. `words`: each `Word`'s `letters`, tapped one key at a time, and optionally the `candidate` to tap to commit it. Without a candidate, or when Gboard does not offer it, the driver taps Space.

It returns a `Typed`:

1. `text`: the text after typing, from the page's `getText`.
2. `picked`: how each word was committed, its candidate or `space`.
3. `compositionstart`: the number of `compositionstart` events.
4. `nested`: `compositionstart` events that arrived while a composition was still open. Above 0 means the keyboard restarted a composition, which loses or doubles text.
5. `compositionstartPerWord`: `compositionstart` events while each word was typed, for example whether Gboard composes the second word after the first was committed.

```ts
import {typeOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

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

When Gboard has not loaded a word's candidates yet, the driver commits it with Space as kana, so a Japanese test accepts the kana for each word as well as the candidate. It never retries an assertion to get the candidate.

### `thumbjar/page`

`recordInput({getText, field})` runs in the page. It records `beforeinput`, `input` and composition events and installs the `window.__state()` the driver reads after each word. `getText` returns the text to report, for example from an editor's model. `field` names the field the driver types into, a `textarea`, a text `input` (`text`, `search`, `tel`, `url` or `password`) or a `[contenteditable]`. A field's text is its `value` for a `textarea` or an `input` and its `textContent` otherwise. Without `field`, events are recorded on `document` in the capture phase, so the field may render later, and `window.__state()` also reports the text of the first `textarea`, text `input` or `[contenteditable]` as `dom`. With `field`, events are recorded on that element along with its text at each event. Each event is also printed to a `#log` element when the page has one.

A page seeds the field and then leaves it to the keyboard. A page that controls it, writing its `value` back from its own state on each input the way a React `value` prop does, restarts Gboard's composition: on a `textarea` that nested 7 of 8 Japanese compositions.

The driver waits until `window.__state` exists before it types. It then taps the field `recordInput` named, or without one the page's first `textarea`, text `input` or `[contenteditable]`, and focuses it with the caret after its text.

### `thumbjar/vitest`

`deviceProject(options)` returns a Vitest project for the device tests: Node environment, one file at a time, `retry: 0`, and a test timeout taken from the time budget below. Pass it the test files in `include`, the `pageUrl` global setup checks and a `pageHint` printed when it does not answer. `outDir` sets where artifacts go, `out` by default, and `setupFiles` adds the consumer's own.

Its global setup fails the run before any test when `adb` has no device or `pageUrl` does not answer. It runs `adb get-state` through the driver's `adb`, so an adb that ignores SIGTERM is killed and one that outlives SIGKILL fails the setup instead of hanging it. Its setup file fails a test file as described under Retries.

`DEVICE_TEST_FILE_SECONDS` is the longest a run of one device test file takes, to run a file under a timeout of the caller's own, for `DEVICE_TESTS_PER_FILE` tests at most, see the time budget below.

### `thumbjar/testing`

`runSuite({root, file, setupFiles})` runs one test file in a Vitest of its own, without reporters, and returns the file's state, its errors and each test's state. Unit tests use it to run a device test file against a fake device or fake typing results set up in `setupFiles`. `file` and `setupFiles` are relative to `root`. `testTimeout` defaults to 5 seconds, and `provide` passes values to the inner run.

### `thumbjar` command

```
thumbjar fetch-u2-jar
thumbjar serve <dir> [--port 8765]
thumbjar prepare --keyboard ja|en --page-url <url> [--out-dir out]
```

1. `fetch-u2-jar` downloads the uiautomator2 server jar into `.cache` and checks its hash. Run it before the emulator boots, so no test pays for it.
2. `serve` serves a built page directory over HTTP, with one log line per request.
3. `prepare` prepares a booted emulator. It waits out the post-boot ANR storm, turns off system error dialogs, makes Chrome skip its first-run screens, shows the soft keyboard with a hardware keyboard attached, adds the Japanese QWERTY layout for `--keyboard ja` through Gboard's settings screens (the Play image has no root to change the locale), checks that `--page-url` answers and, when it is on `localhost`, reverses its port to the device the way the driver does. A step that breaks prints a `PREP FAILED: <step>` line and exits 1. Logs and screen dumps go to `--out-dir`: `phases.log`, `diagnose.txt` with the device, Gboard and Chrome versions, and for Japanese `ja-setup.log` and `ja-setup-*` dumps.

thumbjar never boots the emulator. The caller boots it, for example with `reactivecircus/android-emulator-runner`.

## Retries

Only driver faults are retried, never an assertion. When `typeOnDevice` throws because of the device (the page never loaded over CDP, Gboard never showed, the switch to Japanese failed, uiautomator2 never answered, the system rejected an injected tap, or the attempt ran past 3 minutes) it stops the attempt's device calls, its adb processes and its screen dump, stops Chrome, opens the page again and types everything once more.

The driver reads the typed text to classify a fault in one case only: a digit that neither the prefix nor the typed letters hold. Only a tap that lands as a long press on a key's number hint types one. A page that produced such a digit every time would fault twice and fail the test, so the retry could only hide one that produces it intermittently. Apart from this, the driver never compares the text with anything.

An expression that throws in the page, `window.__state()` or the page's `getText` for instance, is not a driver fault. It can be a failure of the page under test, so an attempt that reports one is never retried and the call ends there with the page's exception in its error, and the `deviceProject` setup file fails the test file with that exception, whether or not the test is marked `test.fails`. The driver only evaluates expressions that can throw once `window.__state` exists, so a page still loading never raises one.

An adb process that outlives SIGTERM and SIGKILL may still be talking to the device. From then on the driver starts no attempt and no call, wherever the process was left, typing, the Chrome restart or the cleanup, and the setup file fails the test file whether or not its tests are marked `test.fails`. The retry prints a `PHASE ... RETRY <test>` line and a `Driver fault in <test>` line in the test's output. A second fault fails the test.

Vitest's own `retry` is 0, so a failed assertion fails the test on its first run.

A tap the system accepted but Gboard never registered is not detected. Gboard's accessibility tree has no pressed state for its keys and no composing text, the English layout shows no suggestion strip, and the Japanese candidate strip follows the composing text the page can corrupt, so judging taps by it could retry a page's bug away. Such a dropped letter fails the test as a wrong text.

`test.fails` counts any error as its expected failure, a driver fault or a test timeout included. `typeOnDevice` records each call when it starts and marks it complete once it returned a result and cleaned up. The setup file fails the test file for a `test.fails` test whose call ended on a driver fault or never completed, naming the test. A driver fault can end a call after one attempt, when no retry is allowed.

## Time budget

The driver cuts every stage of its own off at a deadline, so a hang there ends as a logged failure:

1. One `typeOnDevice` call takes at most 535 seconds: two attempts of 180 seconds, each with a 30-second failure dump and 10 seconds to stop its uiautomator2 servers, a 20-second Chrome restart between them and 35 seconds of cleanup after, each stage with 5 seconds to stop. An adb process gets 2 seconds after SIGTERM and 2 more after SIGKILL, inside those 5. `src/device/budget.ts` holds the bounds, and the device test timeout of 575 seconds that `deviceProject` sets is taken from them: each test has room for one cleanup carried over from a test before it that timed out.
2. `thumbjar prepare` runs the whole prep under `timeout -k 10 600`, so it ends within 610 seconds. The ANR settle starts no new check after 240 seconds and ends within about 285, and the Japanese setup within 250.
3. One device test file runs within `DEVICE_TEST_FILE_SECONDS`, 1825 seconds: three tests, `DEVICE_TESTS_PER_FILE`, of 575 each, 40 for the global setup, 30 for its device check, 5 to stop that adb and 5 for the page check, and 60 for Vitest's own start and exit. A caller that cuts the run off at it lets a test that times out last still leave the setup file room to fail the file.

These are enforced caps, not expected times. A test typically takes a minute or two.

## Artifacts

`typeOnDevice` writes to `outDir`:

1. `<keyboard>-<test>.json`: the page's state after each word, the Gboard candidates and the keys the driver saw. `<test>` is the test name in lowercase with dashes, without its `Scenario:` prefix, for example `ja-typing-kyou-twice-into-an-empty-block.json`. A retried test also has `-retry` files.
2. Screenshots before and after typing each word, and Gboard accessibility dumps.

The `PHASE` lines in the test's output time each driver step.

## Files

1. `src/driver.ts`: `typeOnDevice`, its retry and the time bounds around each attempt.
2. `src/gboard/`: one typing attempt through the uiautomator2 server and CDP, `typing.ts`, and the accessibility dump parser, `hierarchy.ts`.
3. `src/device/`: the adb, uiautomator2 and CDP clients, the time budget and the helpers the deadlines run on.
4. `src/page.ts`: `recordInput`, and `src/testing.ts`: `runSuite`.
5. `src/vitest/`: `deviceProject`, its global setup and its setup file.
6. `src/bin.ts` and `src/prepare/`: the `thumbjar` command, the device prep script, the Japanese setup, the page server, the jar download and `diagnose.sh`, which records device facts and never fails.
7. `src/fixtures/`: accessibility dumps and event logs from CI runs, and fake-device suites, for the unit tests.

Its only runtime dependency is Vitest, which it imports for the current test. adb runs through `child_process`, and CDP goes over the global `WebSocket` and `fetch` through `adb forward`.

## Checking it without an emulator

```
pnpm --filter thumbjar check:types
pnpm --filter thumbjar test:unit
```

The unit tests parse real Gboard accessibility dumps and event logs from CI runs, check the retry, its time bounds and the `test.fails` accounting against a fake device, and check that an aborted attempt opens no uiautomator2 connection. Root `pnpm test:unit` runs them too.

## Known flakes

The emulator is slow on hosted runners. Failures unrelated to the page come from the emulator never coming online, the CDP connection to Chrome dropping, or Gboard rendering only half its keys. Over 16 workflow runs, all 32 jobs were green and 5 of 96 tests needed their one driver retry.
