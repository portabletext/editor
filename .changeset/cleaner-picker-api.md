---
"@portabletext/plugin-typeahead-picker": major
---

feat!: simplify configuration API

**Breaking change:** The `pattern` and `autoCompleteWith` options have been replaced with `trigger`, `keyword`, and `delimiter`.

**Before:**
```ts
defineTypeaheadPicker({
  pattern: /:(\S*)/,
  autoCompleteWith: ':',
  // ...
})
```

**After:**
```ts
defineTypeaheadPicker({
  trigger: /:/,
  keyword: /\S*/,
  delimiter: ':',
  // ...
})
```

**Migration:**

1. Replace `pattern` with separate `trigger` and `keyword` regexes
2. Rename `autoCompleteWith` to `delimiter`
3. Remove capture groups from your patterns - they're no longer needed

The new API makes picker configuration more explicit and easier to understand.
