# Android IME

Types on real Gboard in an Android emulator into a test page built from the workspace editor, and checks what the editor ended up with in Vitest tests.

## What it checks and why a real keyboard

Android keyboards do not send key events. Gboard composes text through the input method, and Chrome turns that into `compositionstart`, `compositionupdate`, `beforeinput` and `input` events whose order and timing depend on the keyboard, its language and what the field already holds. Synthetic composition events in a desktop browser get the order right but not Gboard's reactions to the editor: when the editor rewrites the DOM under an open composition, Gboard can abort it and start a new one, and only a real keyboard shows that.

Each job boots an API 36 emulator with the Play Store image, so the Gboard is the one that ships on phones. It prepares the device for its language and then runs one Vitest test file. Each test opens a page in a fresh Chrome, taps the field, waits for Gboard, taps the letters of each word and commits it, and reads the text and the event log over the Chrome DevTools protocol.

The test files in `tests/` are named `<lang>.<topic>.test.ts`, or `<lang>.test.ts` for the composition tests, and the language decides how the device is prepared:

1. `ja`: Gboard's Japanese QWERTY (romaji) layout, where `kyou` composes きょう and the test commits it by tapping the 今日 candidate. This is where composition bugs show.
2. `en`: plain English typing, where Gboard commits each letter as it goes and opens no composition.

The workflow `.github/workflows/android-ime.yml` runs one job per file, each on its own emulator, from the `{lang, file}` rows of its matrix:

1. `tests/ja.test.ts` and `tests/en.test.ts` type `kyou` twice into a plain `contenteditable` with no editor, `plain.html`, as the control, into the editor's empty block, `editor.html`, and after an `x` the block already holds, `editor.html?prefix=x`.
2. `tests/ja.crashes.test.ts` checks that the editor records no error while range decorations over a word, `editor.html?decorate=<word>`, appear and disappear as the text changes under an open composition. The `今日` case requires the 今日 candidate for both words, since a word committed as kana never shows the decoration. In the `きょう` case word 1 only sets up the open composition and may be committed as kana by Space, as Gboard does on a fresh field when it offers no 今日 yet, and word 2, the trigger, requires 今日. Each word's `expect` makes the driver check that its decoration ranges were committed and mounted, `きょう` while the composition was still open and, for word 2, no longer committed or mounted once 今日 replaced it, so a run that never reached the path ends on a driver fault instead of passing. The `きょう` case is marked `test.fails`: on Gboard the editor throws `removeChild`'s `NotFoundError` when 今日 replaces word 2's decorated composing きょう. The `今日` case passes. The crash needs a composition open while the decorations change.
3. `tests/en.crashes.test.ts` is its control: the same decorations over `you`, `editor.html?decorate=you`, typing `kyou` twice and `u` after `yo`, on English Gboard, which commits each letter without composing. Its cases are ordinary tests that pass. Each asserts that the page recorded no `compositionstart` or `compositionupdate`, failing with "English Gboard composed, so this control run no longer controls for composition" when it did, that a decoration over `you` mounted while each word's letters were tapped, a driver check that needs the ranges to reach the editor, that the committed decoration ranges grew by one range over `you` with each `you` typed, that Space committed each word and the exact final text, and that the page recorded no error.
4. `tests/ja.enter.test.ts` and `tests/en.enter.test.ts` check that a Behavior that deletes `- ` instead of splitting the block on Enter, `editor.html?behavior=dissolve-on-break`, leaves no error, once in a block that loaded with `- ` and once after typing `-` and a space on Gboard. The driver checks that the block held `- ` just before Enter and that the editor performed a `delete.text` over it after, and without an error that one empty block remains.

The `ja.crashes` and Enter cases assert only `errors`, so a case can be marked `test.fails` once its crash reproduces: the crash is then the expected failure, and anything else fails the file, see Retries. Each names one trigger step, the commit of its last word or Enter, and only a `removeChild` error that first shows after that step, with that step's evidence in the page's logs, counts as the crash.

It runs on pull requests that touch the editor's input handling or this app, every night against `main`, and on demand.

## Reading a run

A job goes red when the emulator never booted, a device prep step failed, or a test failed, including a test whose editor assertion did not hold. The workflow is not a required check, so a red job blocks no merge. Read the log to tell the three apart:

1. A `PREP FAILED: <step>` line means the device was never ready and no test ran. `phases.log` and, for Japanese, `ja-setup.log` and `ja-dictionary.log` show where it stopped. A Japanese dictionary that never loaded or never converted is such a prep failure, never an inconclusive or failed test, see Japanese dictionary below.
2. Otherwise Vitest's output lists each test. A failed assertion shows the expected and actual values, and the `github-actions` reporter annotates the test file and writes the job summary.

A required candidate Gboard does not offer is a driver fault too, so no test reads a word committed as kana as a result. A call without a `crash` gets a second chance at the candidate on the retry.

The empty-block test in `tests/ja.test.ts` covers a bug the editor has had: Gboard restarted the composition after the first character typed in an empty block, left that character behind as a full-width `ｋ` and converted the first word without it, as `ｋ用今日`.

### Japanese dictionary

Gboard downloads its Japanese dictionary after the prep adds the Japanese layout and logs `data_loader.cc:121] New data is loaded: ... file_path=.../mozcdata-<version>.data` once it has loaded it. Over 18 fresh boots that came 80 to 176 seconds after boot. A Japanese session Gboard created before that line never converts: `kyou` offers only きょう, never 今日, which made the `今日` case of `tests/ja.crashes.test.ts` inconclusive in 5 of 10 runs. The next switch to Japanese after the line rebuilds the session, logs `ensureSession():515 Mozc engine reload status: RELOADED`, and kanji follows within about 4 seconds. That held on all 11 such switches, 5 of them a switch away and back on a keyboard whose session was created before the load.

So the prep for `ja` does three things around the Japanese setup:

1. Before the ANR settle, it starts `out/boot-logcat.txt`, a capture of the device's `main` log buffer in `-v epoch` format, where Gboard logs both its dictionary load and its session rebuilds, in all 15 boot captures of the probe. Its first line names the device's boot id and boot time, and it is truncated each run, so a file from an earlier boot or one left behind cannot satisfy the wait: a header for another boot or no header at all fails the wait at once, and lines from before the boot time are never read. The prep seeds it with `adb logcat -d`, writes logd's counts of the lines `main` took since boot and of those it still holds, `adb logcat -S`, then keeps an `adb logcat` appending to it, started again when adb drops it. Each reader writes a `CAPTURE_SEGMENT` line first and dumps the buffer again from its oldest line. A missing load line counts as a missing load only when the capture shows it read every `main` line from boot on: the counts after the seed are equal, so `main` had dropped no line, each restarted reader begins on a `main` line the capture already holds, and the reader still writes. Anything else, no counts among them, is a capture fault. A load line found in the capture passes whatever its coverage.
2. After the Japanese setup, `scripts/dictionary.ts wait` waits for the load line in the capture, matched by `data_loader.cc`, `New data is loaded` and a `mozcdata-<version>.data` path, whatever the version, and prints it. It waits until 360 seconds after boot, `DICTIONARY_LOAD_SECONDS`: about twice the slowest load, which also covers a boot that has to retry the dictionary download once more, as one boot did 65 seconds before its load. A line that never comes fails the prep with the Gboard version and the boot's dictionary and download lines, `error downloading __MOZCPACK_...` among them.
3. `scripts/dictionary.ts check` then opens `plain.html` as a scratch field, raises Gboard and switches it to Japanese, or away and back when Japanese is already showing, and requires a `RELOADED` line after that switch: immediately before each tap on Gboard's language key, once the reads that chose it are done, the check logs a line of its own to `main` with `adb shell log`, and only a `RELOADED` line after the last such line and after the change to Japanese that follows it, Gboard's `onCurrentInputMethodEntryChanged` line for `ja-JP`, in one reader's output counts. logd hands a reader the lines in the order it took them, so a reload Gboard logged before the tap that brought Japanese never counts, even within the same second. A Japanese layout that shows before any tap fails the check, since no marker precedes it. It types `kyou`, reads the suggestion strip for a candidate with a CJK ideograph, and deletes the composition without committing anything, then requires the field to be empty with no composition open. No `RELOADED` line, a marker line the capture never shows or no kanji fails the prep with the capture's dictionary lines. The tests then find Gboard on Japanese, as before.

The capture stops before the prep clears logcat for the tests. Every `en` prep starts it too and only stops it.

### Retries

Only driver faults are retried, never an assertion. The helper `typeOnDevice` in `scripts/driver.ts` types and reads back the page. When it throws because of the device (the page never loaded over CDP, Gboard never showed, the switch to Japanese failed, uiautomator2 never answered, the system rejected an injected tap, or the attempt ran past 180 seconds) it stops the attempt's device calls, its adb processes and its screen dump, stops Chrome, opens the page again and types everything once more.

Of the driver's own checks, only one reads the typed text to classify a fault for every call: a digit that neither the prefix nor the typed letters hold, a full-width digit counting as held when the letters hold its ASCII form. Only a tap that lands as a long press on a key's number hint types one. A symbol key is found among the keys alone, never a letter key's number hint, which is a node of its own labelled with its digit. An editor that produced such a digit every time would fault twice and fail the test, so the retry could only hide one that produces it intermittently. The other text checks are a case's opt-in scenario checks, its words' `expect`, below. The composition tests set none, so for them the driver compares the text with nothing else.

An error the page records is not a driver fault either. In a call with a `crash`, once a read of `window.__state()` shows one, the driver stops typing and, when the word's `expect` allows it, see below, returns that state as the attempt's result. A call without a `crash` types every word and returns the errors with its result.

A call without a `crash`, every `ja` and `en` composition test, is retried on any driver fault: the attempt's screen dump, then a Chrome restart and a second attempt, with no read of the page in between. Errors a read recorded do not stop that retry either, since a test that asserts the typed text needs its second attempt more than the errors of a flaky one.

A call that names its `crash` gets no retry that could type past the crash. After a failed attempt that got as far as loading its page, a driver fault, a rejected tap or the attempt's time bound, the driver reads `window.__state()` once more before it taps anything, dumps the screen or restarts Chrome. The read waits for the attempt's calls to stop and runs under its own 30-second bound, which the attempt's expired one cannot cut short. When it shows errors, they are classified as the read the attempt was waiting on would have classified them: after the last tap of a step whose read had not returned yet, the letters, a candidate, Space or Enter, and with that step's evidence, they are the attempt's result, so a screenshot that hangs between the tap and its read cannot retry the crash away. Otherwise the call ends on a driver fault that carries them and is never retried, so the errors are not typed past, and never counts as a result, since a flaky device is no proof of an editor failure. Any other error the page records ends the call the same way. `typeOnDevice` keeps the errors of every read outside the attempt as soon as the read returns, before any other device call, and once it holds any, the call is never retried, whatever fails after the read. Only when the attempt already classified the errors, as its result or as such a fault, does that classification stand over a failure after it. Immediately before the call's first tap on a key that types, a character of the letters, a candidate, Space or Enter, the driver marks its input sent, so a tap whose request failed counts as sent. A fault before that mark, while Chrome starts, the page loads, the field is focused or Gboard switches to Japanese, is retried after a read without errors, and one before the page loaded without a read. A fault after it is never retried: a read without errors cannot show that none of the input is still on its way to the page, where the crash could land after the read.

Such a call ends inconclusive when the fault came after the input mark and the read showed no error, or when the read failed, ran out of time or was skipped because the test timed out or an adb process outlived SIGKILL. Inconclusive means the run cannot tell whether the editor crashed: it is not a crash reproduction and not an editor failure. `tests/setup.ts` fails the file with a message that says so, names the test and the fault, and the job summary counts it on its own. Rerun the job. A file that keeps ending inconclusive on the same fault points at the driver or the device, see the test's `PHASE` lines and the `out/` artifact.

A word's `expect` is a driver check, not an assertion. When the page does not show it, the attempt ends on a driver fault, so a run that never reached a case's mechanism cannot pass as the crash under `test.fails`. In a case with a `crash`, once input was sent, that fault ends the call as inconclusive instead of a retry. Before any input, as for the prefilled text checked before Enter, it is retried after a clean read of the page. Without an error, every piece of it counts, the text, the composition, the mounted decorations and the result after the commit. An error is only a case's crash when it first shows after the one step the case names as its `trigger`, and only when that step's evidence is in the page's logs:

1. `committed`: the decoration ranges of each React commit that hands the editor new ones. A class component next to the editable logs them once per commit: an update in `getSnapshotBeforeUpdate`, before that commit's DOM mutations, and the mount in `componentDidMount`, after them but before the layout effects of the siblings rendered after it. The editor takes the ranges only from an effect of the same commit, so before it changes the DOM for them. React calls neither for a render it abandons or supersedes, so such a render logs nothing. At the trigger the last committed ranges are those before the first error, and they must show the transition: for `今日` one more range over it than before the tap, for `きょう` no range over the kana the word added.
2. `deletions`: each `delete.text` the editor performs, `{at}`, logged by a Behavior on `delete.text` that forwards the event unchanged. `raise` sends the event through every registered Behavior, so it sees the one `dissolve-on-break` raises once the editor dispatches it, before the deletion. At the trigger one over the whole `- ` must be there.

These two logs and `decorated`, the decorations that mounted, take no entry once `errors` holds one, so each holds what led up to the first error and not React's or the editor's reaction to it. A decoration that unmounts after the error also keeps its text in `decorated`. The driver has no timestamps and relies on that. The mounted decorations and the text after an error are not required, since the crash can stop them. An error at any other step, or without that evidence, ends the call on a driver fault that is never retried, and `tests/setup.ts` fails the file for it under `test.fails`.

An expression that throws in the page, `window.__state()` or the editor's snapshot for instance, is not a driver fault. On `plain.html` and on `editor.html` without `decorate` or `behavior`, the composition tests' pages, `window.__state()` throws whatever the editor throws, as it always did, while the crash and Enter pages catch it, see `page`. It can be an editor failure, so an attempt that reports one is never retried and the call ends there with the page's exception in its error, and `tests/setup.ts` fails the test file with that exception, whether or not the test is marked `test.fails`. The driver only evaluates expressions that can throw once `window.__state` exists, so a page still loading never raises one.

An adb process that outlives SIGTERM and SIGKILL may still be talking to the device. From then on the driver starts no attempt and no call, wherever the process was left, typing, the Chrome restart or the cleanup, and `tests/setup.ts` fails the test file whether or not its tests are marked `test.fails`. The retry prints a `PHASE ... RETRY <test>` line and a `Driver fault in <test>` line in the test's output. A second fault fails the test.

Vitest's own `retry` is 0, so a failed assertion fails the test on its first run.

A tap the system accepted but Gboard never registered is not detected. Gboard's accessibility tree has no pressed state for its keys and no composing text, the English layout shows no suggestion strip, and the Japanese candidate strip follows the composing text the editor can corrupt, so judging taps by it could retry an editor bug away. Such a dropped letter fails a composition test as a wrong text. The crash and Enter cases assert no text, so there it shows only when it misses a word's `expect`.

`test.fails` counts any error as its expected failure, a driver fault or a test timeout included. `typeOnDevice` records each call when it starts and marks it complete once it returned a result and cleaned up. `tests/setup.ts` fails the test file for a `test.fails` test whose call ended on a driver fault, with page errors, inconclusive or with neither, or never completed, naming the test. A driver fault can end a call after one attempt, when no retry is allowed.

`scripts/run-on-device.sh` adds one line per file to the job summary, from `tests/setup.ts`, that counts and names its tests by outcome: passed, failed, expected crash reproduced, a `test.fails` test whose call had a `crash` and completed with errors matching it, expected failure, any other `test.fails` test whose call completed, inconclusive, and driver fault, which includes a call that timed out or never cleaned up, with or without `test.fails`. A file whose run ended before its tests finished gets a line that says so.

### Time budget

The driver and `run-on-device.sh` cut every stage of their own off at a deadline, so a hang there ends as a logged failure. The workflow's `timeout-minutes` cap the steps around them, and work inside the emulator runner action, its SDK checks, AVD creation and shutdown, is bounded only by its step's cap:

1. One `typeOnDevice` call takes at most 655 seconds: two attempts of 180 seconds, each with 30 seconds to read the page after a fault, 20 to tap Gboard back to its starting layout, a 30-second failure dump and 10 seconds to stop its uiautomator2 servers, a 20-second Chrome restart between them and 35 seconds of cleanup after, each stage with 5 seconds to stop. An adb process gets 2 seconds after SIGTERM and 2 more after SIGKILL, inside those 5. `scripts/lib/budget.ts` holds the bounds, and the device test timeout of 695 seconds is taken from them.
2. `run-on-device.sh` runs each stage under `timeout -k`. Counting the file's tests takes at most 25 seconds. The whole device prep, readiness check included, takes 910, its 900-second deadline and 10 to stop. Each stage inside it has a cap of its own, and they sum to 898, `prepWorstSeconds` in `scripts/lib/budget.ts`: the boot capture's seed 17, hiding error dialogs 12, the ANR settle, which starts no new check after 240 seconds and one check with its sleep takes at most 45, 285, the device facts 65, Chrome's flags and the soft keyboard 12 and the Japanese setup 250. The dictionary wait ends 360 seconds after boot, or with one more read of 45 seconds when the stages before it ran past that, and 5 more to stop, and the check takes 190. Clearing logcat, the page server check and `adb reverse` take 17. The prep makes no adb or network call outside these stages, which a unit test checks, so a hang in any of them fails the prep at that stage's cap. The diagnostics after the tests take 65. The tests' cap is not fixed. `scripts/suite-seconds.ts` derives it from the file: 655 seconds per test, since the driver runs one call at a time and a timed-out test's call finishes before the next starts, plus 75 for Vitest's startup, and 10 more to stop. A file of three tests is capped at 2040 seconds, so the script ends within 3050 seconds, about 51 minutes.
3. Each run step allows 60 minutes: the emulator boot is capped at 6 by `emulator-boot-timeout` and the script at about 51, which leaves 2.5 for the emulator runner's SDK checks, AVD creation and shutdown. That is an allowance, not a timer of its own. If they take longer, the step's cap cancels the step. The packages download beforehand in their own 8-minute step, so the runner's own install only checks them.
4. Every step has a `timeout-minutes`. The job allows 168 minutes, the sum of the step caps on the path where the first run never boots and the retry runs in full: 40 for naming the suite, setup, the SDK and the page build, 60 for each run, and 8 for the boot check, the result and the upload. A job without a boot retry ends within 108.

`scripts/lib/budget.ts` holds these numbers. Its unit test, `scripts/lib/budget.test.ts`, does four things:

1. It checks that `run-on-device.sh` uses the same caps, that the prep makes no adb or network call outside a capped stage, and that the prep's stages fit its deadline.
2. It checks the test counts against what Vitest collects from each file.
3. It fails when the largest file's script no longer fits a run step with the boot and the 2.5-minute allowance.
4. It checks that the job's cap is the sum of its steps' caps.

A file with a fourth test fails it until the run steps and the job are raised, or the tests move to a new file.

These are enforced caps, not expected times. A typical job takes about 10 minutes.

### Artifacts

Each job uploads an `android-ime-<file>-api36-<attempt>` artifact, `<file>` being the test file's name without `.test.ts`, for example `android-ime-ja.crashes-api36-1`, with:

1. `vitest.log`: Vitest's output, with the `PHASE` lines timing each driver step under the test that printed them.
2. `phases.log`: the device prep steps. For Japanese, `ja-dictionary.log`, the dictionary's load line, the switch, the strip after `kyou` and the `RELOADED` line, and `boot-logcat.txt`, the capture from boot it read them from.
3. `<lang>-<test>.json`: the page's state after each word, the Gboard candidates and the keys the driver saw. `<test>` is the test name in lowercase with dashes, for example `ja-typing-kyou-twice-into-an-empty-block.json`. A retried test also has `-retry` files.
4. Screenshots before and after typing each word, Gboard accessibility dumps, `<lang>-<test>-layout-<n>.xml` for each layout the driver looked through for a symbol, logcat and `diagnose.txt` with the device, Gboard and Chrome versions.

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
IME_LANG=ja scripts/run-on-device.sh tests/ja.test.ts
```

`run-on-device.sh` expects a freshly booted emulator. It prepares the device for `IME_LANG`, serves `dist/` on port 8765, runs the one test file it is given and writes everything to `out/`.

Once a device is prepared and the server runs, run the tests again without the prep:

```
node scripts/serve.ts dist 8765 &
adb reverse tcp:8765 tcp:8765
pnpm --filter android-ime test:device tests/ja.test.ts
```

`test:device` runs every test file in `tests/` unless given one. It fails at once when `adb` has no device or the page is not served. Run the files of one language per prepared device: the `ja` files leave Gboard on Japanese, and the `en` files never switch it back. CI gives each file a device of its own.

To check the driver without an emulator:

```
pnpm --filter android-ime check:types
pnpm --filter android-ime test:unit
```

The unit tests parse real Gboard accessibility dumps and event logs from CI runs, check the retry, its time bounds and the `test.fails` accounting against a fake device, type symbols and required candidates on a fake Gboard built from recorded dumps of its letter layouts, the English symbol layout, the Japanese alphabet layout, the Japanese numeric pad, the emoji panel and the rich symbol panel `記号キーボード` opens, run `tests/ja.test.ts` against fake typing results, run the crash and Enter files marked `test.fails` through the driver against a scripted page on the fake Gboard, run the crash and Enter cases against `editor.html` itself in jsdom with desktop Chrome's user agent, so on the desktop input path, with and without the page's Behavior, run the English decoration cases there and through the driver against a scripted page on the fake Gboard, where each fails on its committed ranges once the page decorates nothing, on its mounted decoration once the page still logs its ranges but the editable gets no `rangeDecorations`, and on its composition check once English Gboard composes, check that each jsdom call restores `__state`, check through `cdpEval` that `editor.html`'s `__state` throws the editor's exception on the composition tests' page and records it on a crash page, check in React and jsdom that the page's committed-ranges log records each committed update once before its DOM changes and nothing for a render that suspends or is superseded, and check that an aborted attempt opens no uiautomator2 connection. `scripts/lib/dictionary.test.ts` reads real lines of a boot capture and real strip dumps: the load line of another dictionary version and none of the other `data_loader.cc` lines, a load line from before the boot or a capture of another boot, lines of other buffers ignored, a `main` buffer that had dropped lines by the first dump, no logd counts, a restarted reader whose first `main` line the capture never read, also when an older line of another buffer comes first, and a stopped reader as capture faults, and a fake Gboard on which the switch, away and back when Japanese is showing, is followed by `RELOADED` and the kanji strip, and a `RELOADED` line from before the switch does not count, also in the same second, nor does one after a switch whose marker never reached the capture. The `page/` tests run in the same unit project. Root `pnpm test:unit` runs them too. The device tests run only through `test:device`.

## Adding a test

A test calls `typeOnDevice` with:

1. `lang`: `ja` switches Gboard to Japanese QWERTY first, `en` leaves it on English.
2. `page`: `plain.html` or `editor.html`, which takes these query parameters. With `decorate` or `behavior` it is a crash page: it records the page's errors, logs `committed`, `deletions` and `decorated`, and once the editor's snapshot throws, `window.__state()` records the exception and returns the last text it read instead of throwing. Without either it is the composition tests' page, which records none of these and whose `window.__state()` returns `{text, dom, events}` and throws what the editor throws:
   1. `decorate=<word>`: a range decoration over every occurrence of `<word>` in each text block, recomputed on every change. `window.__state()` returns the ranges of each commit that handed them to the editor as `committed`.
   2. `behavior=dissolve-on-break`: a Behavior that, on Enter in a block whose text is exactly `- `, raises a `delete.text` over that text instead of splitting the block. A second Behavior on `delete.text` records each one the editor performs in `deletions` and forwards it unchanged.
3. `prefix`: text the block holds before typing, `''` for an empty block. The driver adds it to the page's query as `prefix`.
4. `words`, each with:
   1. `letters`: tapped one key at a time. A letter is tapped on the layout Gboard showed when typing started. ` ` taps the space key. Any other character is a symbol, tapped by the label Gboard gives its key: `-` is `Dash`, for instance. The labels come from a table in `scripts/lib/typing.ts` read off a recorded dump of Gboard's English symbol layout, and a symbol the table lacks is a configuration error, since a label no dump shows would be a guess. `-` is also looked for as itself, as the Japanese numeric pad labels its keys, never as the full-width `－`. The driver taps Gboard's layout key until a layout shows the label, and a letter after it switches back. The layout key is the leftmost bottom-row key whose resource id is `key_pos_back_to_prime` or `key_pos_switch_hiragana_alphabet` or starts with `key_pos_switch_to_`: `Symbol keyboard` on the English letters, `Letter keyboard` on the English symbols, `アルファベット入力キーボード` on Japanese QWERTY, `数字キーボード` on the Japanese alphabet layout and `かな入力キーボード` on the Japanese numeric pad. An emoji key never counts: the English `Emoji button` and the alphabet layout's `絵文字キーボード`, which opens the emoji and media panel, nor does a panel's category key, `key_pos_non_prime_category_<n>`. On Japanese the dash is past romaji, which has only 長音記号, the alphabet layout, which has none, and the numeric pad `数字キーボード` opens, which has digits, `(` and `.` but no dash. For a symbol, the driver taps the pad's `記号キーボード` (`key_pos_switch_to_symbol`) instead of its layout key, which leads back to romaji. `記号キーボード` opens the recorded rich symbol panel. The driver dumps that layout, taps the label only if it is there, and otherwise faults before any input with a message naming the labels it shows and the dump. A label says nothing of what the key commits, so a case typing a dash checks the block's text in the word's `expect` before Enter, and a full-width dash there ends the attempt on that check, its message naming each character's code point. After each tap on the layout key the driver dumps Gboard again until the dump holds a whole layout whose `key_pos_` keys differ from the layout before the tap, so a changed suggestion strip or toolbar does not count as a new layout. A letter layout is whole with every letter and a space key. A layout without the letters, a symbol layout, is whole when its `key_pos_` keys hold its layout key and Delete, and one of the three shapes of the recorded dumps. Rows of keys: a space key, Enter and a row of at least seven content keys, `key_pos_<row>_<column>`, seven being the shortest letter row Gboard draws, `ZXCVBNM`, as the recorded English symbol layout. The numeric pad: a space key, Enter, `かな入力キーボード`, `記号キーボード` and all twelve `key_pos_ja_12keys_<n>` keys, as the recorded Japanese pad, three keys a row. The third shape is the recorded rich symbol panel `記号キーボード` opens, identified by its selected category: exactly one `key_pos_non_prime_category_<n>` selected, labelled `リッチ記号キーボード`, its heading's hide control naming that category too, `文字キーボード`, `削除` and at least three rows of seven cells. Only there are its cells tapped by label, where `-` is also looked for as `ダッシュ` on Japanese. Any other layout, the emoji and media panel included, is never whole, so when `記号キーボード` opens one the driver faults before any input, naming its labels and saving its dump. A dump missing any one of these keys was taken mid-redraw and is dumped again. A layout not dumped so after eight dumps, and a label no layout shows, are driver faults naming the dumps, never another key. Gboard keeps its layout when Chrome restarts, so once an attempt left the starting layout, the driver taps `key_pos_back_to_prime` or the layout key until the starting layout shows, whatever the attempt's outcome, and the retry finds romaji again. That runs once the attempt has its result or fault and, after a fault in a case with a `crash`, the page was read, under its own 20-second bound, and a failure there is only logged, so it changes neither. A word whose letters end in ` ` is committed by that space.
   2. `candidate`: the conversion candidate to tap to commit the word. Without a candidate, or when Gboard does not offer it, the driver taps Space.
   3. `required: true`, with a `candidate`: when Gboard does not offer the candidate, the attempt ends on a driver fault instead of tapping Space. The retry types everything again, and a second miss fails the test, `test.fails` or not. In a case with a `crash` the miss comes after the letters, so the call ends inconclusive without a retry and fails the file the same way. A word whose letters end in ` `, or that has none, cannot require a candidate, and `typeOnDevice` throws before typing.
   4. `enter: true`: the driver taps Gboard's Enter key after committing the word. A word with `letters: ''` and `enter: true` taps only Enter.
   5. `expect`: what the page must show for the word to reach the case's mechanism, checked once its letters are tapped and once it is committed. `trigger` names the step the case is about, `letters` or `commit`, on exactly one word of a case with a `crash`. `text` is the block's text and `composing: true` an open composition once the letters are tapped. `committed` is a commit while the letters were tapped that handed the editor one more range over that text than the last commit before the word, and `decorated` a decoration over it that mounted then. `committedOnCommit` is a commit after the read once the letters were tapped, whose last commit, the last before an error, has one more range over that text than the last commit before that read, `droppedOnCommit` that this last commit has no more ranges over it than the last commit before the word, and `deletedOnCommit` a `delete.text` the editor performed after that read from offset 0 to that text's length in one span. Without an error, `decoratedOnCommit` is a decoration mounted by the commit, `removedOnCommit: true` that no more decorations over `decorated` are still mounted after it than the last commit holds ranges over it, those of earlier words committed as kana, and none over the word's `candidate`, and `textOnCommit` and `blocksOnCommit` the block's text and the number of blocks after it. When the page does not show it, the attempt ends on a driver fault.
5. `crash`: a pattern for the page error the case is about. Any other error the page records ends the call on a driver fault that is never retried. A case with a `crash` gives every word an `expect`, and `typeOnDevice` throws before typing when one has none or when not exactly one names a `trigger`.

It returns:

1. `text`: the text after typing.
2. `picked`: how each word was committed, its candidate or `space`.
3. `compositionstart`: the number of `compositionstart` events.
4. `nested`: `compositionstart` events that arrived while a composition was still open. Above 0 means the keyboard restarted a composition, which loses or doubles text.
5. `compositionstartPerWord`: `compositionstart` events while each word was typed, for example whether Gboard composes the second word after the first was committed.
6. `errors`: the errors a crash page of `editor.html` recorded, from `window` `error` and `unhandledrejection` events and from React's `onUncaughtError` and `onCaughtError`, `[]` for a page that records none. An error here is a result for the test to assert, never a driver fault.
7. `blocks`: the number of blocks in the editor's value, `null` for a page that does not report it.
8. `beforeCommit`: the text and blocks once each word's letters were tapped, before its candidate, Space or Enter.
9. `decoratedPerWord`: the decorations a crash page of `editor.html` mounted while each word was typed and committed, each with its text then, whether a composition was open, and its text now, `live`, `null` once it unmounted, `[]` for a page that records none.
10. `compositionupdate`: the number of `compositionupdate` events.
11. `committedRanges`: the decoration ranges a crash page of `editor.html` handed the editor, one entry per commit that changed them, each range with its text and whether a composition was open, up to the page's first error, `[]` for a page that logs none.

Add the test to the file for its language and topic. For example, to check that Japanese composition after a full-width prefix commits without a restarted composition, typing `sakura` and committing 桜:

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

When Gboard has not loaded a word's candidates yet, the driver commits it with Space as kana, so a Japanese test accepts the kana for each word as well as the candidate. The driver prints a `KANA_FALLBACK triggered` or `KANA_FALLBACK not triggered` line for each completed call without a `crash` whose words name a candidate, from whether Space committed any of them, with the test's name and the picks. It never retries an assertion to get the candidate. A test that says nothing unless the candidate commits the word makes it `required`, and asserts the text with the candidate alone.

Then:

1. Run `pnpm --filter android-ime check:types`.
2. Run the workflow on your branch, or `test:device` against a local emulator, and check the new test's result.
3. If it fails on `main` because of a known bug, make it `test.fails` and describe the bug by its behavior in a comment inside the test. A `test.fails` test asserts the expected outcome alone, for a crash `expect(typed.errors).toEqual([])`, and leaves to the words' `expect` and the case's `crash` everything that shows the run reached the bug, since any other failed assertion would also count as the expected failure.

Each test adds about a minute or two to its job, and a file holds at most three tests within the time budget, which `scripts/lib/budget.test.ts` enforces. A new topic gets a file of its own, `tests/<lang>.<topic>.test.ts`, and a row `{lang: <lang>, file: tests/<lang>.<topic>.test.ts}` in the workflow's matrix. The unit test fails until every file has its row. A page other than `plain.html` and `editor.html` needs its HTML in `page/`, an entry in `vite.config.ts` and a global `window.__state()` that returns `{text, events}`, and optionally `errors`, `blocks`, `decorated`, `committed` and `deletions`, which the driver reads. A page for a case with a `crash` must not throw: a crash page of `editor.html` keeps returning the last text it read once the editor is broken.

## Files

1. `tests/<lang>.test.ts`, `tests/<lang>.<topic>.test.ts`: the device tests, one workflow job each, `crashes` and `enter` the topics so far.
2. `tests/global-setup.ts`: stops the run before any test when there is no device or no page.
3. `tests/setup.ts`: fails a file in which an adb process outlived SIGKILL or the page threw while the driver typed, or whose `test.fails` test ended inconclusive, on a driver fault or never completed, and writes the file's line of the job summary.
4. `scripts/driver.ts`: `typeOnDevice`, its retry and the time bounds around each attempt. `scripts/lib/typing.ts` drives one attempt through the uiautomator2 server and CDP.
5. `scripts/run-on-device.sh`: runs inside the booted emulator. It captures the device's logs from boot, waits out the post-boot ANR storm, turns off system error dialogs, sets up Chrome and Gboard, waits for Gboard's Japanese dictionary, serves the pages and runs the test file it is given.
6. `scripts/setup-ja.ts`: adds the Japanese QWERTY layout through Gboard's settings screens, since the Play image has no root to change the locale. `scripts/dictionary.ts` waits for the dictionary that layout downloads and checks that Gboard converts with it, see Japanese dictionary.
7. `scripts/serve.ts`: serves the built pages to the emulator.
8. `scripts/fetch-u2-jar.ts`: downloads the uiautomator2 server jar and checks its hash.
9. `scripts/lib/`: the adb, uiautomator2, CDP and accessibility dump helpers, and `budget.ts` with the time bounds. `scripts/suite-seconds.ts` prints a file's suite cap for `run-on-device.sh`.
10. `scripts/fixtures/`: accessibility dumps and event logs from CI runs, for the unit tests.
11. `scripts/diagnose.sh`: records device facts and never fails the job.
12. `page/`: the test pages, built with Vite from the workspace editor.
13. `vitest.config.ts`: the `unit` and `device` projects.

The driver is TypeScript with no build step. Its only dependency is Vitest, which it imports for the current test. The prep scripts run directly on Node 24. adb runs through `child_process`, and CDP goes over the global `WebSocket` and `fetch` through `adb forward`.

## Known flakes

The emulator is slow on hosted runners, and each job takes about 10 minutes. Failures unrelated to the editor come from the emulator never coming online, the CDP connection to Chrome dropping, or Gboard rendering only half its keys. Over 16 workflow runs of this branch, all 32 jobs were green and 5 of 96 tests needed their one driver retry.
