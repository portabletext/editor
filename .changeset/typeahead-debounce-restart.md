---
'@portabletext/plugin-typeahead-picker': patch
---

fix: restart the `debounceMs` wait on every keyword change

With `debounceMs` set, `getMatches` now runs once the keyword has stopped changing for `debounceMs`, as documented. Previously the wait started at the first keystroke and later keystrokes did not postpone it, so a request could run before typing stopped. For example, with `debounceMs: 1000` and `@abcd` typed one key every 400ms, `getMatches` was called with `ab` and then `abcd`. Now it is called only with `abcd`, 1000ms after the last keystroke. Pickers without `debounceMs` behave as before.
