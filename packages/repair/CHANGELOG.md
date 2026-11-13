# @portabletext/repair

## 2.0.0

### Major Changes

- [#3675](https://github.com/portabletext/editor/pull/3675) [`9b432f7`](https://github.com/portabletext/editor/commit/9b432f73f98c295d3946bc223ed383c02ecff785) Thanks [@christianhg](https://github.com/christianhg)! - feat!: remove non-object array entries
  
  A string, number, boolean, null or array entry in an array of objects is removed with one `unset` correction.
  
  A correction can now contain an `unset` patch. Code that applies corrections must handle `unset` as well as `set`. `StructuralRule` gains `'non-object'`, so an exhaustive switch over correction types needs a new case.

## 1.0.3

### Patch Changes

- Updated dependencies [[`ee00bd0`](https://github.com/portabletext/editor/commit/ee00bd04df1b2b00af581a2a48ad029cff505e48)]:
  - @portabletext/patches@3.0.5

## 1.0.2

### Patch Changes

- Updated dependencies [[`3729248`](https://github.com/portabletext/editor/commit/3729248acac220c3a5327ad9b85b6faf69aeda4d)]:
  - @portabletext/patches@3.0.4

## 1.0.1

### Patch Changes

- Updated dependencies [[`91e6bcb`](https://github.com/portabletext/editor/commit/91e6bcbe8871bd2af96de15ca6b279895dbdf2ea), [`59d4ee0`](https://github.com/portabletext/editor/commit/59d4ee0cf130ca791a3d4f7474d175b53c7a40a6)]:
  - @portabletext/patches@3.0.3
