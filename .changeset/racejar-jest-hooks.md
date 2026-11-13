---
'racejar': patch
---

fix: run `Before` and `After` hooks in `racejar/jest`

A `Feature` from `racejar/jest` with a `Before` or `After` hook no longer times out waiting for `done()`. Jest reads a hook that declares a parameter as one that takes a `done` callback, and every hook took the scenario context as its parameter, so sync and async hooks both failed.
