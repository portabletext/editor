# @portabletext/plugin-typeahead-picker

## 2.0.5

### Patch Changes

- Updated dependencies [[`ddb324f`](https://github.com/portabletext/editor/commit/ddb324f3294ed961092ad580d69c6c629f6a47d1), [`39b8b21`](https://github.com/portabletext/editor/commit/39b8b21dea18651d8c7e306ea6953b95d9648bb8)]:
  - @portabletext/editor@4.3.5
  - @portabletext/plugin-input-rule@2.0.20

## 2.0.4

### Patch Changes

- Updated dependencies [[`644f895`](https://github.com/portabletext/editor/commit/644f8957344bb62c017d86505795281a9f5f54f4), [`78dfe5e`](https://github.com/portabletext/editor/commit/78dfe5ee8a485b75bd9bc38dc3c023cf9bda7da8)]:
  - @portabletext/editor@4.3.4
  - @portabletext/plugin-input-rule@2.0.19

## 2.0.3

### Patch Changes

- Updated dependencies [[`c98cbb8`](https://github.com/portabletext/editor/commit/c98cbb806f0887e98a38b5bdfeb2d6f44d9ccc60)]:
  - @portabletext/editor@4.3.3
  - @portabletext/plugin-input-rule@2.0.18

## 2.0.2

### Patch Changes

- Updated dependencies [[`cdd34ea`](https://github.com/portabletext/editor/commit/cdd34eae96da4fdcc3b6c3272e0e89b88c410252)]:
  - @portabletext/editor@4.3.2
  - @portabletext/plugin-input-rule@2.0.17

## 2.0.1

### Patch Changes

- [#2128](https://github.com/portabletext/editor/pull/2128) [`dfca3ae`](https://github.com/portabletext/editor/commit/dfca3ae8d060f610ee009617b3d92d41962024bf) Thanks [@christianhg](https://github.com/christianhg)! - fix: use correct @portabletext/editor peer dep version range

- Updated dependencies [[`427ccce`](https://github.com/portabletext/editor/commit/427cccef816c9b6af520123bfeb56b91738a7012), [`dfca3ae`](https://github.com/portabletext/editor/commit/dfca3ae8d060f610ee009617b3d92d41962024bf)]:
  - @portabletext/editor@4.3.1
  - @portabletext/plugin-input-rule@2.0.16

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
