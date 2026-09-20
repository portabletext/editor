# bench

Hermetic typing-latency benchmark for `@portabletext/editor`. Types a fixed
run of keystrokes into a scenario document and measures keydown-to-paint
latency straight off the browser's own [Event Timing
API](https://www.w3.org/TR/event-timing/) — a much smaller slice of
[sanity/perf/bench](https://github.com/sanity-io/sanity/tree/main/perf/bench),
ported to measure this package's editor in isolation, without a studio, a
mock Content Lake, or a document form around it.

## What it measures

A scenario is a schema, a seeded initial value, and a caret target (a
top-level block index to click and place the caret at the end of). A
session: build the host once, launch Chromium, open the scenario, wait for
the whole initial value to reach the DOM, place the caret, type 8 warm-up
keystrokes (discarded), then 32 measured keystrokes at a 100ms cadence. Every
latency number comes from a `PerformanceObserver` installed in the page
before any host code runs (`instrumentation/index.ts`); the runner only
orchestrates clicks and keypresses and drains the collector between phases.
Three scenarios ship: `plain` (one short block), `hugeDoc` (1,000 blocks,
caret in the middle one), `decoratorHeavy` (200 blocks of four spans each,
two of them — indices 1 and 3 — decorated).

`pnpm bench run` reports one build in isolation (median/p75/p90/p99 per
scenario). `pnpm bench self-test` A/Bs the same built dist against itself
across every scenario — a regression or improvement verdict there means the
statistics or the noise controls are broken, not that the editor changed.
There is no PR-comparison mode yet (no merge-base build recipe, no CI
wiring) — `run` and `self-test` are what exists.

## Noise policy

- **One clock.** All latency numbers come from the page's own
  `performance.now()`-based Event Timing entries. The runner times cadence
  in Node, but never turns a Node timestamp into a latency number — the
  cross-process-timing flake class the eFPS suite had.
- **Local built dists, once.** `cli/build-host.ts` builds the Vite host
  once per invocation and serves it over plain HTTP from a local static
  server (see divergences below); every session in a run reuses that same
  build.
- **Fresh browser context per session.** Each session gets its own
  `browser.newContext()` (`runner/session.ts`), so no cookie, cache, or
  in-page state survives across sessions.
- **CPU throttle, and why 8×.** The [Event Timing
  spec](https://www.w3.org/TR/event-timing/) sets a minimum observable
  `duration` of 16ms — anything faster produces no entry at all. Sessions
  therefore run under `Emulation.setCPUThrottlingRate`. Diagnosing a fully
  blind first pass (192/192 `hugeDoc` keystrokes below the floor) turned up
  two separate causes, in order:
  1. **A readiness bug, not a throttle bug.** The editor streams a fresh
     initial value into the DOM 10 blocks per event-loop turn
     (`sync-machine.ts`'s `getStreamedBlocks`); the host's readiness marker
     fired after the first paint, long before a 1,000-block document
     finished streaming. The runner clicked a caret target the stream
     hadn't populated yet and typed through a still-mutating tree —
     keystrokes landed, but scattered across a document that kept
     growing underneath them. Fixed by having the readiness marker
     (`host/src/App.tsx`) wait for `document.querySelectorAll
('[data-block-index]').length` to reach the scenario's block count
     before marking the host ready.
  2. **Even at native throttle, `hugeDoc`/`decoratorHeavy` stayed mostly
     unobservable at 4×.** A calibration loop run once unthrottled and once
     under throttle (recorded in every result's `runner.calibrationMs` /
     `runner.throttledCalibrationMs`) confirmed the throttle itself was
     real (~4–8× depending on rate, never ~1×) — the remaining blindness
     was genuine editor speed, not a broken CDP session. Raising the rate
     to 8× (`DEFAULT_SESSION_CONFIG.cpuThrottleRate`, one config value
     recorded in every result's `config.cpuThrottleRate`) pushed both
     `hugeDoc` and `decoratorHeavy` to 0 below-floor keystrokes out of 192
     across repeated runs.
  - **`plain` stays mostly below the floor on purpose.** A single short
    block is too little work to reliably clear 16ms, even at 8×: recorded
    runs of this bench have landed anywhere from 142 to 179 of 192
    keystrokes on the floor (roughly 74–93%). It is kept anyway: it guards
    against a catastrophic regression (a change that makes even the
    cheapest possible edit cross the floor), not as a source of day-to-day
    signal. Do not read its median as informative.
- **Session validity is checked, not assumed.** Every session reads the
  editor's own text length (off `[data-pt-editor]`, the engine's
  contenteditable root) before and after typing and asserts it grew by
  exactly the warm-up plus measured keystroke count. A session that fails
  this — typing that silently had no effect — is discarded and retried
  (`runner/retry.ts`), up to 3 consecutive failures per call site, the same
  policy sanity's bench uses for its own session failures.
- **Warm-up, discarded.** The first 8 keystrokes of every session are typed
  and drained but never enter the sample — they pay for whatever one-time
  cost focusing/typing into a fresh page incurs.
- **Whole-session bootstrap.** `self-test`'s comparison resamples whole
  sessions, not pooled keystrokes (`stats/bootstrap.ts`): keystrokes inside
  one session share environment state (GC phase, scheduler mood), so
  resampling them individually would understate the interval's width.
- **Verdict floors: `max(16ms, 5%)`.** A difference only gates as a
  regression or improvement when its confidence interval excludes zero
  _and_ the point estimate exceeds both an absolute floor (16ms — one
  Event Timing granularity step above the 8ms duration quantum, so two
  identical builds can never gate off a single quantisation step) and a
  relative floor (5% of the reference median). A CI too wide to decide at
  those floors reports `inconclusive`, distinct from `neutral`, so a noisy
  run never reads as a coin flip (`stats/gate.ts`).
- **`self-test` is the harness's own regression test.** Comparing a build
  against itself across every scenario must produce only `neutral` (or,
  under a wide CI, `inconclusive`) verdicts; a `regression` or
  `improvement` verdict there means the stats kernel or a noise control is
  broken.

## How to run

```bash
cd perf/bench
pnpm bench run --scenario plain             # one scenario, absolute numbers
pnpm bench run --all                        # every scenario
pnpm bench run --all --out /tmp/bench-out   # write results elsewhere

pnpm bench self-test                        # same dist vs itself, every scenario — must be all-neutral

pnpm test:unit                              # stats kernel unit tests
```

Every run writes a `benchRun` JSON to `perf/bench/results/` (or `--out`):
runner/host facts (OS, CPU, both calibration scores), the resolved config,
and per-scenario per-metric sessions, summary stats, and (for `self-test`)
the comparison verdict. `config.seed` only appears on `self-test` runs,
where it seeds the bootstrap's session resampling (`stats/bootstrap.ts`);
`run`'s absolute mode doesn't resample, so it has no seed to record. Each
scenario's own fixture data is generated from a seed baked into that
scenario's source file (`scenarios/plain.ts`, `huge-doc.ts`,
`decorator-heavy.ts`), not from `config.seed`.

## Deterministic run ids

`cli/git-info.ts`'s `computeRunId(mode, branch, sha)` produces
`benchrun-<mode>-<branch>-<sha12>` (lowercase, dashes only, no dots) — the
recipe a future storage layer would key on. Not yet used to name result
files 1:1: `write-result.ts` appends a timestamp so repeated local runs on
the same commit never collide. Documented here so the recipe and its
consumer don't drift apart before anything reads it.

## Divergences from sanity's `perf/bench`

This suite is a slice of sanity's, trimmed to what measuring
`@portabletext/editor` alone needs:

- **No HTTP/2 + TLS server.** The host is served over plain HTTP
  (`runner/static-server.ts`). Sanity's bench needs HTTP/2 because a studio
  keeps several concurrent SSE listeners open to its mock Content Lake, and
  HTTP/1's six-connections-per-host limit starves them. This bench has no
  API host at all — nothing to keep a listener open to.
- **No mock API.** There is no document store, no Actions API, no request
  ledger. The scenario's initial value is passed straight to
  `EditorProvider`; there is nothing to persist a keystroke to.
- **No hermeticity route guard.** Sanity's bench aborts and fails any
  request to a host it doesn't recognize. The host here has no network
  dependencies to police.
- **No INP, page-load, soak, or settle modes.** Only the isolated-cadence
  keydown-to-paint metric and its A/B self-test exist.
- **No PR/CI wiring, no merge-base reference build.** `run` and
  `self-test` are local-only commands today.
- **Tighter A/B budget.** `runAbScenario`'s per-scenario wall-clock budget
  is 5 minutes a side (`DEFAULT_ORCHESTRATOR_CONFIG.budgetMs`); sanity's
  bench budgets 8.
- **Discarded/retried sessions aren't recorded.** A session that fails
  validity and gets retried (`runner/retry.ts`) only shows up in console
  output; unlike sanity's bench, the `benchRun` JSON carries no `failures[]`
  array of what got discarded.
- **No console-error/pageerror session monitoring.** Sanity's bench watches
  the page for console errors and uncaught exceptions during a session;
  this bench doesn't. The text-growth validity check (see the noise policy
  above) is the only in-page failure signal a session gets.
- **Underpowered exits always report `inconclusive`.** If `runAbScenario`'s
  loop ends (budget or session cap) before either side reaches
  `minSessionsPerSide`, the comparison's verdict is forced to
  `inconclusive` regardless of what the bootstrap computed on that handful
  of sessions — a CI on 1-2 sessions a side is degenerate (near-zero width)
  and can otherwise gate a false regression/improvement. `diff`/`lo`/`hi`
  are still reported for visibility.

## Keep in sync

Several modules are directly ported from sanity's suite and say so in their
own header comment (`instrumentation/index.ts`, `runner/browser.ts`,
`runner/orchestrator.ts`, `stats/bootstrap.ts`, `stats/gate.ts`,
`stats/quantiles.ts`, `stats/rng.ts`, `runner/retry.ts`,
`runner/bundle-instrumentation.ts`). `runner/session.ts`'s `toSessionResult`
is a near-verbatim port of sanity's `toLatencies`
(`runner/session/interaction.ts`) and carries the same pointer in its own
comment. When `sanity-io/sanity`'s `perf/bench` changes the shared shape
those port from (Event Timing collection, CPU calibration, the bootstrap
kernel, the gate thresholds), check whether this bench needs the same
change.
