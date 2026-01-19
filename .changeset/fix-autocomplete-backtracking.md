---
"@portabletext/plugin-typeahead-picker": patch
---

fix: incorrect keyword when text contains `autoCompleteWith` char

Inserting `"::)"` at once would incorrectly produce keyword `":"` instead of
`":)"`. The auto-complete pattern was matching `"::"` prematurely instead of
waiting for the full input.
