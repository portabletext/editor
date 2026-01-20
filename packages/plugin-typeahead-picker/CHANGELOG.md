# @portabletext/plugin-typeahead-picker

## 2.0.0

### Major Changes

- [#2124](https://github.com/portabletext/editor/pull/2124) [`da5540b`](https://github.com/portabletext/editor/commit/da5540bb763df7b7aac54cb2ede9bd708a00a27a) Thanks [@christianhg](https://github.com/christianhg)! - feat!: simplify configuration API

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

### Patch Changes

- [#2124](https://github.com/portabletext/editor/pull/2124) [`d767bfd`](https://github.com/portabletext/editor/commit/d767bfd2f031e8a457395d3ba362e327f51bce77) Thanks [@christianhg](https://github.com/christianhg)! - fix: incorrect keyword when text contains `autoCompleteWith` char

  Inserting `"::)"` at once would incorrectly produce keyword `":"` instead of
  `":)"`. The auto-complete pattern was matching `"::"` prematurely instead of
  waiting for the full input.

- [#2124](https://github.com/portabletext/editor/pull/2124) [`ea90602`](https://github.com/portabletext/editor/commit/ea906022bce8bdc21d6370ce8b9245bcadeae6f0) Thanks [@christianhg](https://github.com/christianhg)! - fix: an empty pattern text is an invalid pattern text

- [#2124](https://github.com/portabletext/editor/pull/2124) [`16f6e84`](https://github.com/portabletext/editor/commit/16f6e840f5d451bfdaeb3e63edd356c5570b46ee) Thanks [@christianhg](https://github.com/christianhg)! - fix: handle case where there are multiple exact matches

- [#2124](https://github.com/portabletext/editor/pull/2124) [`2743b2e`](https://github.com/portabletext/editor/commit/2743b2e3d2712a70869745d80ca48009985c2675) Thanks [@christianhg](https://github.com/christianhg)! - fix: triggering after trigger char

- [#2124](https://github.com/portabletext/editor/pull/2124) [`d216ad0`](https://github.com/portabletext/editor/commit/d216ad09635cf759884cdb91b56d325c432c7bb3) Thanks [@christianhg](https://github.com/christianhg)! - fix: complete match after trigger char

- [#2124](https://github.com/portabletext/editor/pull/2124) [`4d9e820`](https://github.com/portabletext/editor/commit/4d9e82006db160baaf76f0a51a54964df1517a0c) Thanks [@christianhg](https://github.com/christianhg)! - fix: use `ReadonlyArray` for matches
